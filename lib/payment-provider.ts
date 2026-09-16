import crypto from "node:crypto";

export type PremiumPackageId = "monthly" | "yearly";

export type PremiumPackage = {
  id: PremiumPackageId;
  name: string;
  priceLabel: string;
  billingPeriod: string;
  priceId: string | null;
};

export const PREMIUM_PACKAGES: PremiumPackage[] = [
  {
    id: "monthly",
    name: "Premium Monthly",
    priceLabel: process.env.PREMIUM_MONTHLY_PRICE_LABEL ?? "Configured in Stripe",
    billingPeriod: "Billed monthly",
    priceId: process.env.PREMIUM_MONTHLY_PRICE_ID ?? null,
  },
  {
    id: "yearly",
    name: "Premium Yearly",
    priceLabel: process.env.PREMIUM_YEARLY_PRICE_LABEL ?? "Configured in Stripe",
    billingPeriod: "Billed yearly",
    priceId: process.env.PREMIUM_YEARLY_PRICE_ID ?? null,
  },
];

export function getPremiumPackage(id: string): PremiumPackage | null {
  return PREMIUM_PACKAGES.find((item) => item.id === id) ?? null;
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
  if (!selectedPackage?.priceId) throw new Error("This Premium package is not configured yet.");

  const secretKey = requiredEnv("STRIPE_SECRET_KEY");
  const origin = process.env.URL ?? "http://localhost:3000";
  const params = new URLSearchParams({
    mode: "subscription",
    success_url: `${origin}/dashboard/premium?checkout=success`,
    cancel_url: `${origin}/dashboard/premium?checkout=cancelled`,
    customer_email: email,
    "line_items[0][price]": selectedPackage.priceId,
    "line_items[0][quantity]": "1",
    "metadata[user_id]": userId,
    "metadata[package_id]": packageId,
    "subscription_data[metadata][user_id]": userId,
    "subscription_data[metadata][package_id]": packageId,
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
    cache: "no-store",
  });
  const payload = (await response.json()) as { url?: string; error?: { message?: string } };
  if (!response.ok || !payload.url) throw new Error(payload.error?.message ?? "Unable to create checkout session.");
  return { url: payload.url };
}

export function verifyStripeWebhook(payload: string, signature: string, secret: string): boolean {
  const timestamp = signature.match(/(?:^|,)t=(\d+)/)?.[1];
  const signatures = [...signature.matchAll(/(?:^|,)v1=([^,]+)/g)].map((match) => match[1]);
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return signatures.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate);
    const expectedBuffer = Buffer.from(expected);
    return candidateBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
  });
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      PREMIUM_PACKAGES.some((item) => item.priceId),
  );
}
