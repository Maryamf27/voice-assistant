import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { validateRegistration, type Registration } from "@/lib/validation";
export async function POST(request: Request) { try { const input = await request.json() as Partial<Registration>; const error = validateRegistration(input); if (error) return NextResponse.json({ error }, { status: 400 }); await connectToDatabase(); const email = input.email!.trim().toLowerCase(); const existing = await User.exists({ email }); if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 }); const user = await User.create({ name: input.name!.trim(), email, passwordHash: await bcrypt.hash(input.password!, 12) }); await createSession({ id: user.id, name: user.name, email: user.email }); return NextResponse.json({ ok: true }, { status: 201 }); } catch (error) { if ((error as { code?: number }).code === 11000) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 }); console.error("Registration failed", error); return NextResponse.json({ error: "Unable to create your account. Please try again." }, { status: 500 }); } }
