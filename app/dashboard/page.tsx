import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageIntro, QuickActionCard, StatCard, EmptyState, StatusBadge, Waveform } from "@/components/ui";
import { IconWaveform, IconMic, IconSparkle, IconLibrary, IconArrowRight, IconClock } from "@/components/icons";

type RecentGeneration = { id: string; text: string; status: string; createdAt: string };

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let totalGenerations = 0;
  let charactersUsed = 0;
  let savedVoices = 0;
  let recent: RecentGeneration[] = [];
  let displayName = "there";
  let statsAvailable = false;

  if (user) {
    try {
      const [profileResult, generationsResult, voicesCountResult, recentResult] = await Promise.all([
        supabase.from("profiles").select("name").eq("id", user.id).single(),
        supabase.from("generations").select("input").eq("user_id", user.id),
        supabase.from("voices").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("generations")
          .select("id, input, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (generationsResult.error) throw generationsResult.error;
      if (voicesCountResult.error) throw voicesCountResult.error;
      if (recentResult.error) throw recentResult.error;

      displayName = profileResult.data?.name || displayName;
      totalGenerations = generationsResult.data?.length ?? 0;
      charactersUsed = (generationsResult.data ?? []).reduce((sum, row) => sum + (row.input?.length ?? 0), 0);
      savedVoices = voicesCountResult.count ?? 0;
      recent = (recentResult.data ?? []).map((doc) => ({ id: doc.id, text: doc.input, status: doc.status, createdAt: doc.created_at }));
      statsAvailable = true;
    } catch (error) {
      console.error("Could not load dashboard stats", error);
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="Your workspace"
        title={`Welcome back, ${displayName}.`}
        description="Create, shape, and manage voices in one focused workspace."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total generations"
          value={statsAvailable ? totalGenerations.toLocaleString() : "—"}
          detail={statsAvailable ? "All-time text-to-speech requests" : "Unavailable right now"}
          icon={<IconWaveform className="h-4 w-4" />}
        />
        <StatCard
          label="Characters used"
          value={statsAvailable ? charactersUsed.toLocaleString() : "—"}
          detail={statsAvailable ? "Across all generations" : "Unavailable right now"}
          icon={<IconSparkle className="h-4 w-4" />}
        />
        <StatCard
          label="Saved voices"
          value={statsAvailable ? savedVoices.toLocaleString() : "—"}
          detail={statsAvailable ? "Personal, designed & library" : "Unavailable right now"}
          icon={<IconMic className="h-4 w-4" />}
        />
        <StatCard
          label="Recent activity"
          value={statsAvailable ? recent.length.toLocaleString() : "—"}
          detail={statsAvailable ? "Shown in the last 5 generations" : "Unavailable right now"}
          icon={<IconClock className="h-4 w-4" />}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink-primary">Start creating</h2>
        <p className="mt-1 text-sm text-ink-muted">Choose a workspace to prepare your next voice project.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          <QuickActionCard icon={<IconWaveform className="h-5 w-5" />} title="Text to Speech" description="Turn your script into expressive audio." href="/dashboard/tts" />
          <QuickActionCard icon={<IconMic className="h-5 w-5" />} title="Clone Voice" description="Prepare a recording for a personal voice." href="/dashboard/clone" />
          <QuickActionCard icon={<IconSparkle className="h-5 w-5" />} title="Design Voice" description="Describe the voice you have in mind." href="/dashboard/design" />
          <QuickActionCard icon={<IconLibrary className="h-5 w-5" />} title="Voice Library" description="Search and add authorized voices." href="/dashboard/library" />
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-primary">Recent activity</h2>
          {recent.length > 0 && (
            <Link href="/dashboard/history" className="inline-flex items-center gap-1 text-sm font-medium text-brand-violetSoft hover:text-brand-violet">
              View all <IconArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <EmptyState
            title="Your activity will appear here"
            description="Generate your first piece of audio in Text to Speech to see it tracked here."
            action={{ label: "Open Text to Speech", href: "/dashboard/tts" }}
          />
        ) : (
          <div className="space-y-3">
            {recent.map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-xl border border-base-border bg-base-card/90 p-4 transition hover:border-brand-violet/30">
                <div className="hidden h-8 w-16 shrink-0 sm:block">
                  <Waveform seed={item.id} bars={22} className="h-full" active={item.status === "completed"} />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm text-ink-primary/90">{item.text}</p>
                <StatusBadge status={item.status} />
                <p className="hidden shrink-0 text-xs text-ink-faint sm:block">{new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
