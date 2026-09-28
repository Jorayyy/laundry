"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { ActionState } from "@/app/actions/customers";

const expenseSchema = z.object({
  category: z.enum([
    "DETERGENT", "FABRIC_SOFTENER", "ELECTRICITY", "WATER", "RENT", "SALARIES",
    "MAINTENANCE", "PACKAGING", "TRANSPORTATION", "EQUIPMENT", "SUPPLIES", "OTHER",
  ]),
  description: z.string().trim().optional().default(""),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  spentAt: z.string().optional().default(""),
  method: z.enum(["CASH", "GCASH", "BANK_TRANSFER", "CARD", "OTHER"]).optional().nullable(),
  reference: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
});

export async function saveExpense(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { category, description, amount, spentAt, method, reference, notes } = parsed.data;

  const expense = await db.expense.create({
    data: {
      category,
      description: description || null,
      amount,
      spentAt: spentAt ? new Date(spentAt) : new Date(),
      method: method || null,
      reference: reference || null,
      notes: notes || null,
      createdById: user.id,
    },
  });

  await logAudit({ userId: user.id, action: "EXPENSE_CREATED", entity: "Expense", entityId: expense.id, meta: { amount, category } });
  revalidatePath("/");
  revalidatePath("/expenses");
  revalidatePath("/reports");
  return { success: "Expense recorded." };
}

export async function deleteExpense(id: string): Promise<ActionState> {
  const user = await requireUser();
  await db.expense.delete({ where: { id } });
  await logAudit({ userId: user.id, action: "EXPENSE_DELETED", entity: "Expense", entityId: id });
  revalidatePath("/");
  revalidatePath("/expenses");
  return { success: "Expense deleted." };
}
