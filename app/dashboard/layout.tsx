import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { getCurrentUser } from "@/lib/auth";
import { getUserSubscription } from "@/lib/entitlements";
import { DashboardRevalidator } from "@/components/dashboard-revalidator";
import { ReactQueryProvider } from "@/components/react-query-provider";
import { SubscriptionProvider } from "@/components/subscription-provider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (user === null) redirect("/login");

  const subscription = await getUserSubscription(user.id);
  const isPremium = subscription?.plan === "premium" && subscription.subscriptionStatus === "active";
  return (
    <ReactQueryProvider>
      <SubscriptionProvider isPremium={isPremium}>
        <div className="h-screen overflow-hidden bg-base-bg md:flex">
          <DashboardRevalidator />
          <DashboardSidebar isPremium={isPremium} />
          <div className="flex min-w-0 min-h-0 flex-1 flex-col">
            <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-base-border bg-base-bg/85 px-4 backdrop-blur-md md:px-8">
              <DashboardSidebar mobileOnly isPremium={isPremium} />
              <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
                <p className="max-w-[9rem] truncate text-sm font-medium text-ink-primary sm:max-w-[14rem]">{user.name}</p>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
                    isPremium
                      ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
                      : "border-base-border bg-base-surface text-ink-muted"
                  }`}
                >
                  {isPremium ? "✦ Premium" : "Free"}
                </span>
              </div>
            </header>
            <main className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
            </main>
          </div>
        </div>
      </SubscriptionProvider>
    </ReactQueryProvider>
  );
}
