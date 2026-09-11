import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateRegistration, type Registration } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const input = await request.json() as Partial<Registration>;
    const validationError = validateRegistration(input);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const email = input.email!.trim().toLowerCase();
    const name = input.name!.trim();

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password!,
      options: { data: { name } },
    });

    if (error) {
      const message = /already registered|already exists/i.test(error.message)
        ? "An account with this email already exists."
        : error.message;
      return NextResponse.json({ error: message }, { status: error.status === 422 ? 409 : (error.status ?? 400) });
    }

    if (!data.session) {
      return NextResponse.json(
        { error: "Account created. Check your email to confirm it, then sign in." },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json({ error: "Unable to create your account. Please try again." }, { status: 500 });
  }
}
