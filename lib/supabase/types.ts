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

export type Database = {
  public: {
    Tables: {
      payment_webhook_events: {
        Row: { id: number; provider: string; event_id: string; received_at: string };
        Insert: { id?: number; provider: string; event_id: string; received_at?: string };
        Update: Partial<{ provider: string; event_id: string; received_at: string }>;
        Relationships: [];
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
          premium_package_id: PremiumPackageId | null;
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
          premium_package_id?: PremiumPackageId | null;
          subscription_ends_at?: string | null;
        };
        Update: Partial<{ name: string; email: string | null; plan: Plan; subscription_status: SubscriptionStatus; lemonsqueezy_subscription_id: string | null; lemonsqueezy_customer_id: string | null; lemonsqueezy_variant_id: string | null; premium_package_id: PremiumPackageId | null; subscription_ends_at: string | null; updated_at: string }>;
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
