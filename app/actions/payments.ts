"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { paymentStatusOf, validatePayment } from "@/lib/calc";
import { num, round2 } from "@/lib/money";
import type { ActionState } from "@/app/actions/customers";

const paymentSchema = z.object({
  orderId: z.string().min(1),
  amount: z.coerce.number(),
  method: z.enum(["CASH", "GCASH", "BANK_TRANSFER", "CARD", "OTHER"]),
  reference: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
});

export async function recordPayment(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { orderId, amount, method, reference, notes } = parsed.data;

  try {
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error("Order not found.");
      if (order.status === "CANCELLED") throw new Error("Cannot record payment on a cancelled order.");

      const payments = await tx.payment.aggregate({
        where: { orderId, voidedAt: null },
        _sum: { amount: true },
      });
      const paid = round2(num(payments._sum.amount));
      const total = round2(num(order.total));

      const err = validatePayment(total, paid, amount);
      if (err) throw new Error(err);

      const payment = await tx.payment.create({
        data: { orderId, amount, method, reference: reference || null, notes: notes || null, createdById: user.id },
      });

      const newPaid = round2(paid + amount);
      await tx.order.update({
        where: { id: orderId },
        data: { paidAmount: newPaid, paymentStatus: paymentStatusOf(total, newPaid) },
      });

      await tx.orderActivity.create({
        data: { orderId, userId: user.id, action: "PAYMENT_RECEIVED", message: `Payment recorded: ${amount.toFixed(2)}` },
      });

      return payment;
    });

    await logAudit({ userId: user.id, action: "PAYMENT_RECORDED", entity: "Payment", entityId: result.id, meta: { orderId, amount, method } });
    revalidatePath("/");
    revalidatePath("/orders");
    revalidatePath("/payments");
    revalidatePath(`/orders/${orderId}`);
    return { success: "Payment recorded." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not record payment." };
  }
}

export async function voidPayment(paymentId: string): Promise<ActionState> {
  const user = await requireUser();

  try {
    await db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new Error("Payment not found.");
      if (payment.voidedAt) throw new Error("Payment is already voided.");

      await tx.payment.update({ where: { id: paymentId }, data: { voidedAt: new Date() } });

      const remaining = await tx.payment.aggregate({
        where: { orderId: payment.orderId, voidedAt: null },
        _sum: { amount: true },
      });
      const order = await tx.order.findUnique({ where: { id: payment.orderId } });
      const paid = round2(num(remaining._sum.amount));
      const total = round2(num(order!.total));
      await tx.order.update({
        where: { id: payment.orderId },
        data: { paidAmount: paid, paymentStatus: paymentStatusOf(total, paid) },
      });

      await tx.orderActivity.create({
        data: {
          orderId: payment.orderId,
          userId: user.id,
          action: "PAYMENT_VOIDED",
          message: `Payment voided: ${num(payment.amount).toFixed(2)}`,
        },
      });
    });

    await logAudit({ userId: user.id, action: "PAYMENT_VOIDED", entity: "Payment", entityId: paymentId });
    revalidatePath("/");
    revalidatePath("/orders");
    revalidatePath("/payments");
    return { success: "Payment voided." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not void payment." };
  }
}
