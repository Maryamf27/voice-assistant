import crypto from "node:crypto";
import type { PremiumPackageId, UserSubscription } from "@/lib/supabase/types";
import { hasPremiumAccess } from "./premium-access";

export type { PremiumPackageId };

const PREMIUM_BENEFITS = [
  "Unlimited Text-to-Speech generation",
  "Premium voice workspace",
  "Voice cloning",
  "Full premium access",
  "No ads",
];

export type PremiumPackage = {
  id: PremiumPackageId;
  name: string;
  intervalLabel: string;
  priceAmount: number;
  currency: string;
  priceLabel: string;
  billingPeriod: string;
  description: string;
  benefits: string[];
  variantId: string | null;
  featured?: boolean;
};

export type PublicPremiumPackage = Omit<PremiumPackage, "variantId"> & {
  isConfigured: boolean;
};
export const PREMIUM_PACKAGES: PremiumPackage[] = [
  {
    id: "monthly",
    name: "Premium Monthly",
    intervalLabel: "MONTHLY",
    priceAmount: 799,
    currency: "PKR",
    priceLabel: "PKR 799",
    billingPeriod: "/month",
    description: "Flexible premium access with monthly billing.",
    benefits: PREMIUM_BENEFITS,
    variantId: process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID ?? null,
  },
  {
    id: "yearly",
    name: "Premium Yearly",
    intervalLabel: "YEARLY",
    priceAmount: 7999,
    currency: "PKR",
    priceLabel: "PKR 7,999",
    billingPeriod: "/year",
    description: "Premium access with yearly billing.",
    benefits: PREMIUM_BENEFITS,
    variantId: process.env.LEMON_SQUEEZY_YEARLY_VARIANT_ID ?? null,
    featured: true,
  },
];

export function getPremiumPackage(id: string): PremiumPackage | null {
  return PREMIUM_PACKAGES.find((item) => item.id === id) ?? null;
}

export function getPublicPremiumPackages(): PublicPremiumPackage[] {
  return PREMIUM_PACKAGES.map(({ variantId, ...item }) => ({
    ...item,
    isConfigured: Boolean(variantId),
  }));
}

export function formatPkrAmount(amount: number): string {
  return `PKR ${amount.toLocaleString("en-US")}`;
}

export function getYearlySavingsMessage(packages: Array<Pick<PremiumPackage, "id" | "priceAmount">> = PREMIUM_PACKAGES): string | null {
  const monthly = packages.find((item) => item.id === "monthly");
  const yearly = packages.find((item) => item.id === "yearly");
  if (!monthly || !yearly) return null;

  const billedAsMonthly = monthly.priceAmount * 12;
  const saved = billedAsMonthly - yearly.priceAmount;
  if (saved <= 0) return "Save vs monthly billing";

  const percent = Math.round((saved / billedAsMonthly) * 100);
  if (percent > 0) return `Save ${percent}% vs monthly billing`;
  return `Save ${formatPkrAmount(saved)} vs monthly billing`;
}

export function resolvePremiumPackageId({
  variantId,
  packageId,
}: {
  variantId?: string | number | null;
  packageId?: string | null;
}): PremiumPackageId | null {
  if (packageId === "monthly" || packageId === "yearly") return packageId;

  if (variantId == null || variantId === "") return null;
  const normalizedVariantId = String(variantId);
  const matches = PREMIUM_PACKAGES.filter((item) => item.variantId && item.variantId === normalizedVariantId);
  return matches.length === 1 ? matches[0].id : null;
}

export async function resolveActivePremiumPackageId(subscription: UserSubscription | null): Promise<PremiumPackageId | null> {
  // Active, or cancelled but still inside the paid period.
  if (!subscription || !hasPremiumAccess(subscription)) return null;

  const stored = resolvePremiumPackageId({
    variantId: subscription.variantId,
    packageId: subscription.packageId,
  });
  if (stored) return stored;

  const liveVariantId = await getSubscriptionVariantId(subscription.subscriptionId);
  return resolvePremiumPackageId({ variantId: liveVariantId });
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export async function createPremiumCheckout({
  packageId,
  userId,
  email,
}: {
  packageId: PremiumPackageId;
  userId: string;
  email: string;
}): Promise<{ url: string }> {
  const selectedPackage = getPremiumPackage(packageId);
  if (!selectedPackage?.variantId) throw new Error("This Premium package is not configured yet.");

  const apiKey = requiredEnv("LEMON_SQUEEZY_API_KEY");
  const storeId = requiredEnv("LEMON_SQUEEZY_STORE_ID");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? requiredEnv("URL")).replace(/\/$/, "");

  const checkoutData = {
    data: {
      type: "checkouts",
      attributes: {
        product_options: {
          redirect_url: `${appUrl}/dashboard/premium?checkout=success`,
        },
        checkout_data: {
          custom: {
            user_id: userId,
            package_id: packageId,
          },
        },
      },
      relationships: {
        store: {
          data: {
            type: "stores",
            id: storeId,
          },
        },
        variant: {
          data: {
            type: "variants",
            id: selectedPackage.variantId,
          },
        },
      },
    },
  };

  const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify(checkoutData),
    cache: "no-store",
  });

  const payload = (await response.json()) as { data?: { attributes?: { url?: string } }; errors?: Array<{ detail?: string }> };
  if (!response.ok || !payload.data?.attributes?.url) {
    throw new Error(payload.errors?.[0]?.detail ?? "Unable to create checkout session.");
  }

  return { url: payload.data.attributes.url };
}

export function verifyLemonSqueezyWebhook(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const expected = hmac.digest("hex");
  
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  
  return signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

export type LemonSqueezySubscriptionDetails = {
  status: string | null;
  variantId: string | null;
  renewsAt: string | null;
  endsAt: string | null;
  cancelled: boolean;
};

type LemonSqueezySubscriptionPayload = {
  data?: {
    attributes?: {
      status?: string;
      variant_id?: number | string | null;
      renews_at?: string | null;
      ends_at?: string | null;
      cancelled?: boolean;
    };
  };
};

function parseSubscriptionDetails(payload: LemonSqueezySubscriptionPayload): LemonSqueezySubscriptionDetails | null {
  const attributes = payload.data?.attributes;
  if (!attributes) return null;
  return {
    status: attributes.status ?? null,
    variantId: attributes.variant_id == null ? null : String(attributes.variant_id),
    renewsAt: attributes.renews_at ?? null,
    endsAt: attributes.ends_at ?? null,
    cancelled: attributes.cancelled === true,
  };
}

export async function getSubscriptionDetails(subscriptionId: string | null): Promise<LemonSqueezySubscriptionDetails | null> {
  if (!subscriptionId || !process.env.LEMON_SQUEEZY_API_KEY) return null;
  const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`, {
    headers: {
      Authorization: `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
      Accept: "application/vnd.api+json",
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return parseSubscriptionDetails((await response.json()) as LemonSqueezySubscriptionPayload);
}

export async function cancelSubscriptionAtPeriodEnd(subscriptionId: string): Promise<LemonSqueezySubscriptionDetails> {
  const apiKey = requiredEnv("LEMON_SQUEEZY_API_KEY");
  const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({ data: { type: "subscriptions", id: subscriptionId, attributes: { cancelled: true } } }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to cancel the subscription.");

  const details = parseSubscriptionDetails((await response.json()) as LemonSqueezySubscriptionPayload);
  if (!details) throw new Error("Lemon Squeezy returned an unexpected cancellation response.");
  return details;
}

export async function getSubscriptionVariantId(subscriptionId: string | null): Promise<string | null> {
  if (!subscriptionId || !process.env.LEMON_SQUEEZY_API_KEY) return null;
  const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`, {
    headers: {
      Authorization: `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
      Accept: "application/vnd.api+json",
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { data?: { relationships?: { variant?: { data?: { id?: string } } } } };
  return payload.data?.relationships?.variant?.data?.id ?? null;
}

export function isLemonSqueezyConfigured(): boolean {
  return Boolean(
    process.env.LEMON_SQUEEZY_API_KEY &&
      process.env.LEMON_SQUEEZY_STORE_ID &&
      process.env.LEMON_SQUEEZY_WEBHOOK_SECRET &&
      PREMIUM_PACKAGES.some((item) => item.variantId),
  );
}
