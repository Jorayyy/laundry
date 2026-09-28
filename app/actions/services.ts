"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { ActionState } from "@/app/actions/customers";

const serviceSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  description: z.string().trim().optional().default(""),
  pricingType: z.enum(["PER_KG", "PER_ITEM", "FIXED"]),
  price: z.coerce.number().min(0, "Price must be zero or greater."),
  minQuantity: z.coerce.number().min(0).default(1),
  active: z.boolean().default(true),
});

export async function saveService(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireOwner();
  const id = formData.get("id")?.toString();
  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    pricingType: formData.get("pricingType"),
    price: formData.get("price"),
    minQuantity: formData.get("minQuantity") ?? 1,
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const duplicate = await db.service.findFirst({
    where: { name: { equals: parsed.data.name, mode: "insensitive" }, ...(id ? { NOT: { id } } : {}) },
  });
  if (duplicate) return { error: "A service with this name already exists." };

  if (id) {
    const before = await db.service.findUnique({ where: { id }, select: { price: true } });
    await db.service.update({ where: { id }, data: parsed.data });
    if (before && Number(before.price) !== parsed.data.price) {
      await logAudit({
        userId: user.id,
        action: "SERVICE_PRICE_CHANGED",
        entity: "Service",
        entityId: id,
        meta: { from: Number(before.price), to: parsed.data.price },
      });
    }
  } else {
    const created = await db.service.create({ data: parsed.data });
    await logAudit({ userId: user.id, action: "SERVICE_CREATED", entity: "Service", entityId: created.id });
  }

  revalidatePath("/services");
  return { success: id ? "Service updated." : "Service created." };
}

export async function toggleService(id: string): Promise<ActionState> {
  const user = await requireOwner();
  const current = await db.service.findUnique({ where: { id }, select: { active: true } });
  if (!current) return { error: "Service not found." };
  const svc = await db.service.update({ where: { id }, data: { active: !current.active } });
  await logAudit({ userId: user.id, action: "SERVICE_TOGGLED", entity: "Service", entityId: id, meta: { active: svc.active } });
  revalidatePath("/services");
  return { success: `Service ${svc.active ? "activated" : "deactivated"}.` };
}
