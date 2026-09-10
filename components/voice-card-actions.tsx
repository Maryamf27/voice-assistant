"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/dialog";
import { IconTrash, IconArrowRight } from "@/components/icons";

export function VoiceCardActions({ voiceId, readyForTts }: { voiceId: string; readyForTts: boolean }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/voices/${voiceId}`, { method: "DELETE" });
      if (!response.ok) {
        let message = "Unable to delete this voice.";
        try { const data = await response.json() as { error?: string }; if (data.error) message = data.error; } catch { /* Use the default message. */ }
        setError(message);
        setDeleting(false);
        setConfirmOpen(false);
        return;
      }
      router.refresh();
    } catch {
      setError("A network error occurred. Please try again.");
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="mt-5 space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-base-border px-3 py-2 text-xs text-ink-muted transition hover:border-state-rose/40 hover:text-state-rose disabled:opacity-60"
        >
          <IconTrash className="h-3.5 w-3.5" />
          {deleting ? "Deleting…" : "Delete"}
        </button>
        {readyForTts ? (
          <Link href={`/dashboard/tts?voice=${voiceId}`} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-violet px-3 py-2 text-xs font-medium text-white transition hover:bg-brand-violetDim">
            Use in TTS
            <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="ml-auto rounded-lg border border-base-border px-3 py-2 text-xs text-ink-faint">Not ready for TTS</span>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-state-rose">{error}</p>}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this voice?"
        description="This will permanently remove the voice from your library. This cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
