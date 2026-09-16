import crypto from "node:crypto";

export type PremiumPackageId = "monthly" | "yearly";

export type PremiumPackage = {
  id: PremiumPackageId;
  name: string;
  priceLabel: string;
  billingPeriod: string;
  variantId: string | null;
};

export const PREMIUM_PACKAGES: PremiumPackage[] = [
  {
    id: "monthly",
    name: "Premium Monthly",
    priceLabel: process.env.PREMIUM_MONTHLY_PRICE_LABEL ?? "Configured in Lemon Squeezy",
    billingPeriod: "Billed monthly",
    variantId: process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID ?? null,
  },
  {
    id: "yearly",
    name: "Premium Yearly",
    priceLabel: process.env.PREMIUM_YEARLY_PRICE_LABEL ?? "Configured in Lemon Squeezy",
    billingPeriod: "Billed yearly",
    variantId: process.env.LEMON_SQUEEZY_YEARLY_VARIANT_ID ?? null,
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
  if (!selectedPackage?.variantId) throw new Error("This Premium package is not configured yet.");

  const apiKey = requiredEnv("LEMON_SQUEEZY_API_KEY");
  const storeId = requiredEnv("LEMON_SQUEEZY_STORE_ID");
  const origin = process.env.URL ?? "http://localhost:3000";

  const checkoutData = {
    data: {
      type: "checkouts",
      attributes: {
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
  const expected = hmac.digest("base64");
  
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  
  return signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

export function isLemonSqueezyConfigured(): boolean {
  return Boolean(
    process.env.LEMON_SQUEEZY_API_KEY &&
      process.env.LEMON_SQUEEZY_STORE_ID &&
      process.env.LEMON_SQUEEZY_WEBHOOK_SECRET &&
      PREMIUM_PACKAGES.some((item) => item.variantId),
  );
}
