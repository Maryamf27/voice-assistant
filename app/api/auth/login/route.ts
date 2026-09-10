import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateCredentials, type Credentials } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const input = await request.json() as Partial<Credentials>;
    const validationError = validateCredentials(input);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: input.email!.trim().toLowerCase(),
      password: input.password!,
    });

    if (error) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Unable to sign in. Please try again." }, { status: 500 });
  }
}
