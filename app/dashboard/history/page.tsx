import { PageIntro } from "@/components/ui";
import { HistoryList } from "@/components/history-list";

export default function HistoryPage() {
  return (
    <>
      <PageIntro
        eyebrow="Activity"
        title="Generation history"
        description="Search, filter, and replay your previously generated audio."
      />
      <HistoryList />
    </>
  );
}
