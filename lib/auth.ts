import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "voice_studio_session";
function secret() { const value = process.env.AUTH_SECRET; if (!value || value.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters."); return new TextEncoder().encode(value); }
export type SessionUser = { id: string; name: string; email: string };
export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
  const store = await cookies();
  store.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export async function destroySession() { const store = await cookies(); store.delete(COOKIE_NAME); }
export async function getCurrentUser(): Promise<SessionUser | null> {
  try { const token = (await cookies()).get(COOKIE_NAME)?.value; if (!token) return null; const { payload } = await jwtVerify(token, secret());
    if (typeof payload.id !== "string" || typeof payload.email !== "string" || typeof payload.name !== "string") return null;
    return { id: payload.id, email: payload.email, name: payload.name };
  } catch { return null; }
}
export { COOKIE_NAME };
