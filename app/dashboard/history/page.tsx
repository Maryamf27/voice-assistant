import { PageIntro } from "@/components/ui";
import { HistoryList } from "@/components/history-list";
import { InAppAd } from "@/components/in-app-ad";

export default function HistoryPage() {
  return (
    <>
      <PageIntro
        eyebrow="Activity"
        title="Generation history"
        description="Search, filter, and replay your previously generated audio."
      />
      <HistoryList />
      <div className="mt-8">
        <InAppAd
          instanceKey="history-normal-bottom"
          placement="normal"
          enableNormalSchedule
        />
      </div>
    </>
  );
}
