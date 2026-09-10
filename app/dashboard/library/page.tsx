import { VoiceLibrary } from "@/components/voice-library";
import { PageIntro } from "@/components/ui";

export default function VoiceLibraryPage() {
  return (
    <>
      <PageIntro
        eyebrow="Discover"
        title="Voice Library"
        description="Search authorized voices, preview them, and add your favorites to My Voices."
      />
      <VoiceLibrary />
    </>
  );
}
