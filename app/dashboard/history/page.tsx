import { PageIntro } from "@/components/ui";
import { HistoryList } from "@/components/history-list";
import { AdSlot } from "@/components/adsterra";

export default function HistoryPage() {
  return (
    <>
      <PageIntro
        eyebrow="Activity"
        title="Generation history"
        description="Search, filter, and replay your previously generated audio."
      />
      <HistoryList />
      <AdSlot className="mt-8" variant="native" />
    </>
  );
}
