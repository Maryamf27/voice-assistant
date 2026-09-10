export type VoiceType = "personal" | "designed" | "library";
export type GenerationStatus = "pending" | "processing" | "completed" | "failed";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; name: string; email: string | null; created_at: string; updated_at: string };
        Insert: { id: string; name: string; email?: string | null };
        Update: Partial<{ name: string; email: string | null; updated_at: string }>;
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
