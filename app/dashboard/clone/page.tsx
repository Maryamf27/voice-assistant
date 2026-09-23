import { CloneForm } from "@/components/studio-forms";
import { PageIntro } from "@/components/ui";
export default function ClonePage() {
    return <>
        <PageIntro eyebrow="Create" title="Clone a voice" description="Upload a permitted audio sample to create a reusable personal voice." /><CloneForm />
    </>;
}
