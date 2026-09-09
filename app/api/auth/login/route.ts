import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { validateCredentials, type Credentials } from "@/lib/validation";
export async function POST(request: Request) { try { const input = await request.json() as Partial<Credentials>; const error = validateCredentials(input); if (error) return NextResponse.json({ error }, { status: 400 }); await connectToDatabase(); const user = await User.findOne({ email: input.email!.trim().toLowerCase() }).select("+passwordHash"); if (!user || !(await bcrypt.compare(input.password!, user.passwordHash))) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 }); await createSession({ id: user.id, name: user.name, email: user.email }); return NextResponse.json({ ok: true }); } catch (error) { console.error("Login failed", error); return NextResponse.json({ error: "Unable to sign in. Please try again." }, { status: 500 }); } }
