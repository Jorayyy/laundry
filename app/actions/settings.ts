"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { ActionState } from "@/app/actions/customers";

const settingsSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required."),
  address: z.string().trim().optional().default(""),
  phone: z.string().trim().optional().default(""),
  email: z.string().trim().email("Invalid email.").or(z.literal("")).optional().default(""),
  currency: z.string().trim().min(1).default("PHP"),
  orderPrefix: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{1,10}$/, "Prefix must be 1-10 letters/numbers.")
    .default("LD"),
  receiptHeader: z.string().trim().optional().default(""),
  receiptFooter: z.string().trim().optional().default(""),
});

export async function saveSettings(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireOwner();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.settings.upsert({
    where: { id: "single" },
    create: { id: "single", ...parsed.data },
    update: parsed.data,
  });
  await logAudit({ userId: user.id, action: "SETTINGS_UPDATED", entity: "Settings", entityId: "single" });
  revalidatePath("/settings");
  return { success: "Settings saved." };
}

const userSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  email: z.string().trim().email("Invalid email."),
  role: z.enum(["OWNER", "STAFF"]),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function createUser(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireOwner();
  const parsed = userSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) return { error: "An account with this email already exists." };

  const created = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
    },
  });
  await logAudit({ userId: user.id, action: "USER_CREATED", entity: "User", entityId: created.id, meta: { role: created.role } });
  revalidatePath("/settings");
  return { success: "Account created." };
}

export async function toggleUser(id: string): Promise<ActionState> {
  const user = await requireOwner();
  if (id === user.id) return { error: "You cannot deactivate your own account." };

  const target = await db.user.findUnique({ where: { id }, select: { active: true, name: true } });
  await db.user.update({ where: { id }, data: { active: !target!.active } });
  await logAudit({ userId: user.id, action: "USER_TOGGLED", entity: "User", entityId: id, meta: { active: !target!.active } });
  revalidatePath("/settings");
  return { success: `${target!.name} ${target!.active ? "deactivated" : "activated"}.` };
}

export async function resetPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireOwner();
  const id = formData.get("id")?.toString();
  const password = formData.get("password")?.toString() ?? "";
  if (!id) return { error: "User not found." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  await logAudit({ userId: user.id, action: "PASSWORD_RESET", entity: "User", entityId: id });
  return { success: "Password updated." };
}
