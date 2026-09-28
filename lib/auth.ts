import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export async function getUser() {
  const id = await getSessionUserId();
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id } });
  if (!user || !user.active) return null;
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/");
  return user;
}
