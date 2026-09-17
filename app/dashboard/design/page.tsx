import { redirect } from "next/navigation";
import { DesignForm } from "@/components/studio-forms";
import { PageIntro } from "@/components/ui";
import { isVoiceDesignEnabled } from "@/lib/feature-flags";

export default function DesignPage() {
  if (!isVoiceDesignEnabled()) {
    redirect("/dashboard");
  }

  return (
    <>
      <PageIntro
        eyebrow="Create"
        title="Design a voice"
        description="Describe a voice, preview generated candidates, and save the one you like."
      />
      <DesignForm />
    </>
  );
}
