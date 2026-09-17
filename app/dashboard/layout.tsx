import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { getCurrentUser } from "@/lib/auth";
import { getUserSubscription } from "@/lib/entitlements";
import { DashboardRevalidator } from "@/components/dashboard-revalidator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (user === null) redirect("/login");

  const subscription = await getUserSubscription(user.id);
  const isPremium = subscription?.plan === "premium" && subscription.subscriptionStatus === "active";
  return (
    <div className="h-screen overflow-hidden bg-base-bg md:flex">
      <DashboardRevalidator />
      <DashboardSidebar userName={user.name} isPremium={isPremium} />
      <div className="flex min-w-0 min-h-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-base-border bg-base-bg/85 px-4 backdrop-blur-md md:px-8">
          <DashboardSidebar mobileOnly userName={user.name} isPremium={isPremium} />
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-ink-primary">{user.name}</p>
              <p className="text-xs text-ink-faint">Your voice workspace</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-base-border bg-base-surface text-sm font-semibold text-brand-violetSoft">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
