import crypto from "node:crypto";

export type PremiumPackageId = "monthly" | "yearly";

export type PremiumPackage = {
  id: PremiumPackageId;
  name: string;
  priceLabel: string;
  billingPeriod: string;
  description: string;
  benefits: string[];
  variantId: string | null;
};

// Keep customer-facing package details in one place so pricing changes are deliberate.
export const PREMIUM_PACKAGES: PremiumPackage[] = [
  {
    id: "monthly",
    name: "Premium Monthly",
    priceLabel: "PKR 140",
    billingPeriod: "/ month",
    description: "Flexible access for month-to-month voice creation.",
    benefits: ["Unrestricted Text to Speech generation", "Premium voice workspace", "Verified subscription access"],
    variantId: process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID ?? null,
  },
  {
    id: "yearly",
    name: "Premium Yearly",
    priceLabel: "PKR 140",
    billingPeriod: "/ year",
    description: "Premium access with yearly billing for your voice workflow.",
    benefits: ["Unrestricted Text to Speech generation", "Premium voice workspace", "Verified subscription access"],
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
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? requiredEnv("URL")).replace(/\/$/, "");

  const checkoutData = {
    data: {
      type: "checkouts",
      attributes: {
        product_options: {
          redirect_url: `${appUrl}/dashboard?checkout=success`,
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
