import { cookies } from "next/headers";
import crypto from "node:crypto";

const COOKIE = "laundry_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(data: string) {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

export async function createSession(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + MAX_AGE })
  ).toString("base64url");
  const value = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;

  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof parsed.sub !== "string") return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now() / 1000) return null;
    return parsed.sub;
  } catch {
    return null;
  }
}
