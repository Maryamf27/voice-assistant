export type VoiceType = "personal" | "designed" | "library";
export type GenerationStatus = "pending" | "processing" | "completed" | "failed";
export type Plan = "free" | "premium";
export type SubscriptionStatus = "inactive" | "active";
export type PremiumPackageId = "monthly" | "yearly";

export type UserSubscription = {
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionId: string | null;
  customerId: string | null;
  endsAt: string | null;
  variantId: string | null;
  packageId: PremiumPackageId | null;
};

export type SubscriptionHistoryStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "paused"
  | "inactive"
  | string;

export type SubscriptionHistoryItem = {
  id: number;
  subscriptionId: string;
  customerId: string | null;
  variantId: string | null;
  packageId: PremiumPackageId | null;
  plan: Plan | string | null;
  status: SubscriptionHistoryStatus;
  price: number | null;
  currency: string | null;
  startedAt: string | null;
  renewsAt: string | null;
  endsAt: string | null;
  createdAt: string | null;
};

export type Database = {
  public: {
    Tables: {
      payment_webhook_events: {
        Row: { id: number; provider: string; event_id: string; received_at: string };
        Insert: { id?: number; provider: string; event_id: string; received_at?: string };
        Update: Partial<{ provider: string; event_id: string; received_at: string }>;
        Relationships: [];
      };
      subscription_history: {
        Row: {
          id: number;
          user_id: string;
          lemonsqueezy_subscription_id: string;
          lemonsqueezy_customer_id: string | null;
          lemonsqueezy_variant_id: string | null;
          subscription_interval: PremiumPackageId | string | null;
          plan: Plan | string | null;
          status: SubscriptionHistoryStatus;
          price: number | null;
          currency: string | null;
          started_at: string | null;
          renews_at: string | null;
          ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          lemonsqueezy_subscription_id: string;
          lemonsqueezy_customer_id?: string | null;
          lemonsqueezy_variant_id?: string | null;
          subscription_interval?: PremiumPackageId | string | null;
          plan?: Plan | string | null;
          status?: SubscriptionHistoryStatus;
          price?: number | null;
          currency?: string | null;
          started_at?: string | null;
          renews_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          user_id: string;
          lemonsqueezy_subscription_id: string;
          lemonsqueezy_customer_id: string | null;
          lemonsqueezy_variant_id: string | null;
          subscription_interval: PremiumPackageId | string | null;
          plan: Plan | string | null;
          status: SubscriptionHistoryStatus;
          price: number | null;
          currency: string | null;
          started_at: string | null;
          renews_at: string | null;
          ends_at: string | null;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "subscription_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          plan: Plan;
          subscription_status: SubscriptionStatus;
          lemonsqueezy_subscription_id: string | null;
          lemonsqueezy_customer_id: string | null;
          lemonsqueezy_variant_id: string | null;
          subscription_interval: PremiumPackageId | null;
          subscription_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email?: string | null;
          plan?: Plan;
          subscription_status?: SubscriptionStatus;
          lemonsqueezy_subscription_id?: string | null;
          lemonsqueezy_customer_id?: string | null;
          lemonsqueezy_variant_id?: string | null;
          subscription_interval?: PremiumPackageId | null;
          subscription_ends_at?: string | null;
        };
        Update: Partial<{
          name: string;
          email: string | null;
          plan: Plan;
          subscription_status: SubscriptionStatus;
          lemonsqueezy_subscription_id: string | null;
          lemonsqueezy_customer_id: string | null;
          lemonsqueezy_variant_id: string | null;
          subscription_interval: PremiumPackageId | null;
          subscription_ends_at: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      voices: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: VoiceType;
          fish_reference_id: string | null;
          audio_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: VoiceType;
          fish_reference_id?: string | null;
          audio_url?: string | null;
        };
        Update: Partial<{ name: string; type: VoiceType; fish_reference_id: string | null; audio_url: string | null }>;
        Relationships: [];
      };
      generations: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          input: string;
          voice_id: string | null;
          voice_name: string | null;
          model: string | null;
          status: GenerationStatus;
          audio_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          input: string;
          voice_id?: string | null;
          voice_name?: string | null;
          model?: string | null;
          status: GenerationStatus;
          audio_url?: string | null;
        };
        Update: Partial<{ status: GenerationStatus; audio_url: string | null; voice_id: string | null }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
