export const PAKISTAN_TIME_ZONE = "Asia/Karachi";

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: PAKISTAN_TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: PAKISTAN_TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatPakistanShortDate(
  value: string | Date | null | undefined,
): string | null {
  if (!value) return null;
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return SHORT_DATE_FORMATTER.format(d);
  } catch {
    return null;
  }
}

export function formatPakistanLongDate(
  value: string | Date | null | undefined,
): string | null {
  if (!value) return null;
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return LONG_DATE_FORMATTER.format(d);
  } catch {
    return null;
  }
}

export function formatCurrencyPrice({
  price,
  currency,
}: {
  price: number | null | undefined;
  currency: string | null | undefined;
}): string {
  if (price == null) return "Price unavailable";
  const normalizedCurrency = (currency ?? "PKR").toUpperCase();
  try {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${normalizedCurrency} ${price.toLocaleString("en-US")}`;
  }
}

export type NormalizedSubscriptionStatus =
  | "Active"
  | "Cancelled"
  | "Expired"
  | "Paused"
  | "Inactive";

export function normalizeStatusLabel(
  status: string | null | undefined,
): NormalizedSubscriptionStatus {
  if (!status) return "Inactive";
  switch (status.toLowerCase()) {
    case "active":
      return "Active";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    case "expired":
      return "Expired";
    case "paused":
    case "on_pause":
      return "Paused";
    default:
      return "Inactive";
  }
}

export function statusTone(
  label: NormalizedSubscriptionStatus,
): {
  pill: string;
  dot: string;
} {
  switch (label) {
    case "Active":
      return {
        pill: "bg-audio-mint/12 text-audio-mint border-audio-mint/25",
        dot: "bg-audio-mint",
      };
    case "Cancelled":
    case "Expired":
      return {
        pill: "bg-state-rose/10 text-state-rose border-state-rose/25",
        dot: "bg-state-rose",
      };
    case "Paused":
      return {
        pill: "bg-state-amber/12 text-state-amber border-state-amber/25",
        dot: "bg-state-amber",
      };
    case "Inactive":
    default:
      return {
        pill: "bg-base-surface text-ink-muted border-base-border",
        dot: "bg-ink-faint",
      };
  }
}

export function billingIntervalLabel(
  value: "monthly" | "yearly" | string | null | undefined,
): {
  interval: "Monthly" | "Yearly" | "Billing interval unavailable";
  period: "/ month" | "/ year" | "";
  known: boolean;
} {
  if (value === "monthly") {
    return { interval: "Monthly", period: "/ month", known: true };
  }
  if (value === "yearly") {
    return { interval: "Yearly", period: "/ year", known: true };
  }
  return { interval: "Billing interval unavailable", period: "", known: false };
}