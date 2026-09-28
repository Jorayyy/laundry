"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { orderTotals, validateLine, lineSubtotal, type LineInput } from "@/lib/calc";
import { canTransition, type OrderStatus } from "@/lib/labels";
import type { ActionState } from "@/app/actions/customers";

const lineSchema = z.object({
  serviceId: z.string().min(1, "Select a service."),
  quantity: z.coerce.number(),
});

const orderSchema = z.object({
  customerId: z.string().min(1, "Select a customer."),
  dueAt: z.string().optional().default(""),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().trim().optional().default(""),
  internalNotes: z.string().trim().optional().default(""),
  lines: z.array(lineSchema).min(1, "Add at least one service line."),
});

async function nextOrderNo(tx: Parameters<Parameters<typeof db.$transaction>[0]>[0], prefix: string) {
  const counter = await tx.orderCounter.upsert({
    where: { key: "order" },
    create: { key: "order", value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${prefix}-${String(counter.value).padStart(5, "0")}`;
}

export async function createOrder(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const rawLines = formData.getAll("lines").map((entry) => {
    const obj = Object.fromEntries(new URLSearchParams(entry.toString()));
    return {
      serviceId: obj.serviceId ?? "",
      quantity: obj.quantity ?? "",
      unitPrice: obj.unitPrice ?? "",
    };
  });

  const parsed = orderSchema.safeParse({
    customerId: formData.get("customerId"),
    dueAt: formData.get("dueAt") ?? "",
    discount: formData.get("discount") || 0,
    notes: formData.get("notes") ?? "",
    internalNotes: formData.get("internalNotes") ?? "",
    lines: rawLines.map((l) => ({ serviceId: l.serviceId, quantity: l.quantity })),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const services = await db.service.findMany({
    where: { id: { in: parsed.data.lines.map((l) => l.serviceId) }, active: true },
  });
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  const lines: LineInput[] = [];
  for (const [i, raw] of rawLines.entries()) {
    const svc = serviceMap.get(raw.serviceId);
    if (!svc) return { error: `Line ${i + 1}: service not found or inactive.` };
    const quantity = Number(raw.quantity);
    const requested = Number(raw.unitPrice);
    const unitPrice =
      user.role === "OWNER" && Number.isFinite(requested) && requested >= 0
        ? requested
        : Number(svc.price);
    const line: LineInput = { pricingType: svc.pricingType, unitPrice, quantity };
    const err = validateLine(line, i);
    if (err) return { error: err };
    lines.push(line);
  }

  const { subtotal, discount, total } = orderTotals(lines, parsed.data.discount);
  if (parsed.data.discount > subtotal)
    return { error: "Discount cannot be greater than the subtotal." };
  const dueAt = parsed.data.dueAt ? new Date(parsed.data.dueAt) : null;

  try {
    const order = await db.$transaction(async (tx) => {
      const settings = await tx.settings.findUnique({ where: { id: "single" } });
      const orderNo = await nextOrderNo(tx, settings?.orderPrefix ?? "LD");
      const created = await tx.order.create({
        data: {
          orderNo,
          customerId: parsed.data.customerId,
          subtotal,
          discount,
          total,
          notes: parsed.data.notes || null,
          internalNotes: parsed.data.internalNotes || null,
          dueAt,
          createdById: user.id,
          updatedById: user.id,
          items: {
            create: lines.map((line, i) => {
              const svc = serviceMap.get(rawLines[i].serviceId)!;
              return {
                serviceId: svc.id,
                serviceName: svc.name,
                pricingType: line.pricingType,
                unitPrice: line.unitPrice,
                quantity: line.quantity,
                subtotal: lineSubtotal(line),
              };
            }),
          },
        },
      });
      await tx.orderActivity.create({
        data: { orderId: created.id, userId: user.id, action: "CREATED", toStatus: "RECEIVED" },
      });
      return created;
    });

    await logAudit({ userId: user.id, action: "ORDER_CREATED", entity: "Order", entityId: order.id, meta: { orderNo: order.orderNo, total } });
    revalidatePath("/");
    revalidatePath("/orders");
    redirect(`/orders/${order.id}`);
  } catch (e) {
    console.error("[order:create]", e);
    return { error: "Could not create the order. Please try again." };
  }
}

export async function changeOrderStatus(orderId: string, to: OrderStatus): Promise<ActionState> {
  const user = await requireUser();
  const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true, orderNo: true } });
  if (!order) return { error: "Order not found." };
  if (!canTransition(order.status, to)) return { error: `Cannot move from ${order.status} to ${to}.` };

  try {
    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: to,
          updatedById: user.id,
          completedAt: to === "COMPLETED" ? new Date() : null,
        },
      });
      await tx.orderActivity.create({
        data: { orderId, userId: user.id, action: "STATUS_CHANGED", fromStatus: order.status, toStatus: to },
      });
    });
    await logAudit({
      userId: user.id,
      action: "ORDER_STATUS_CHANGED",
      entity: "Order",
      entityId: orderId,
      meta: { from: order.status, to },
    });
    revalidatePath("/");
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return { success: `Status updated to ${to}.` };
  } catch (e) {
    console.error("[order:status]", e);
    return { error: "Could not update status." };
  }
}

export async function updateOrderNotes(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Order not found." };
  await db.order.update({
    where: { id },
    data: {
      notes: formData.get("notes")?.toString() || null,
      internalNotes: formData.get("internalNotes")?.toString() || null,
      updatedById: user.id,
    },
  });
  await logAudit({ userId: user.id, action: "ORDER_EDITED", entity: "Order", entityId: id });
  revalidatePath(`/orders/${id}`);
  return { success: "Notes saved." };
}
