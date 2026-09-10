import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { FishAudioError, designVoice, isProviderCreditError } from "@/lib/fish-audio";
import { validateDesignCandidateCount, validateVoiceInstruction, validateVoiceReferenceText } from "@/lib/validation";

type DesignInput = { instruction?: unknown; referenceText?: unknown; n?: unknown };

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  let input: DesignInput;
  try {
    input = await request.json() as DesignInput;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const instructionError = validateVoiceInstruction(input.instruction);
  if (instructionError) {
    return NextResponse.json({ error: instructionError }, { status: 400 });
  }
  const instruction = (input.instruction as string).trim();

  const referenceTextError = validateVoiceReferenceText(input.referenceText);
  if (referenceTextError) {
    return NextResponse.json({ error: referenceTextError }, { status: 400 });
  }
  const referenceText = typeof input.referenceText === "string" ? input.referenceText.trim() : undefined;

  const countError = validateDesignCandidateCount(input.n);
  if (countError) {
    return NextResponse.json({ error: countError }, { status: 400 });
  }
  const count = typeof input.n === "number" ? input.n : undefined;

  try {
    const candidates = await designVoice({ instruction, referenceText: referenceText || undefined, count });
    return NextResponse.json({ candidates });
  } catch (error) {
    if (isProviderCreditError(error)) {
      return NextResponse.json(
        {
          error: "Voice Design is currently unavailable because the AI provider has insufficient API credits. Please try again later.",
          code: "provider_unavailable",
        },
        { status: 503 },
      );
    }
    if (error instanceof FishAudioError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Voice design request failed", error);
    return NextResponse.json({ error: "Unable to design a voice right now. Please try again." }, { status: 500 });
  }
}
