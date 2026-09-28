"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const attempts = new Map<string, { count: number; resetAt: number }>();

function throttled(key: string) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || rec.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  rec.count++;
  return rec.count > 10;
}

export async function login(_: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const email = parsed.data.email.toLowerCase();
  if (throttled(email)) return { error: "Too many attempts. Try again in a minute." };

  const user = await db.user.findUnique({ where: { email } });
  const valid = user && user.active && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!valid) {
    await logAudit({ action: "LOGIN_FAILED", entity: "User", meta: { email } });
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);
  await logAudit({ userId: user.id, action: "LOGIN", entity: "User", entityId: user.id });
  redirect(user.role === "OWNER" ? "/" : "/");
}

export async function logout() {
  const userId = await (await import("@/lib/session")).getSessionUserId();
  await destroySession();
  if (userId) await logAudit({ userId, action: "LOGOUT", entity: "User", entityId: userId });
  redirect("/login");
}
