"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const customerSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  phone: z.string().trim().min(7, "Phone is required."),
  email: z.string().trim().email("Invalid email.").or(z.literal("")).optional().default(""),
  address: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
});

export type ActionState = { error?: string; success?: string };

export async function saveCustomer(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = formData.get("id")?.toString();
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { name, phone, email, address, notes } = parsed.data;

  const existing = await db.customer.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      phone,
      archivedAt: null,
      ...(id ? { NOT: { id } } : {}),
    },
    select: { id: true },
  });
  if (existing) return { error: "A customer with this name and phone already exists." };

  if (id) {
    await db.customer.update({
      where: { id },
      data: { name, phone, email: email || null, address: address || null, notes: notes || null },
    });
    await logAudit({ userId: user.id, action: "CUSTOMER_UPDATED", entity: "Customer", entityId: id });
  } else {
    const created = await db.customer.create({
      data: { name, phone, email: email || null, address: address || null, notes: notes || null },
    });
    await logAudit({ userId: user.id, action: "CUSTOMER_CREATED", entity: "Customer", entityId: created.id });
  }

  revalidatePath("/customers");
  return { success: id ? "Customer updated." : "Customer created." };
}

export async function archiveCustomer(id: string): Promise<ActionState> {
  const user = await requireUser();
  await db.customer.update({ where: { id }, data: { archivedAt: new Date() } });
  await logAudit({ userId: user.id, action: "CUSTOMER_ARCHIVED", entity: "Customer", entityId: id });
  revalidatePath("/customers");
  return { success: "Customer archived." };
}

export async function redeemLoyalty(id: string): Promise<ActionState> {
  const user = await requireUser();
  try {
    await db.customer.update({ where: { id }, data: { loyaltyRedemptions: { increment: 1 } } });
    await logAudit({ userId: user.id, action: "LOYALTY_REDEEMED", entity: "Customer", entityId: id });
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: "Reward redeemed — loyalty card reset." };
  } catch (e) {
    console.error("[loyalty:redeem]", e);
    return { error: "Could not redeem reward." };
  }
}
