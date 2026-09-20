import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          bg: "#08090F",
          card: "#10121B",
          surface: "#141722",
          border: "#252938",
        },
        brand: {
          violet: "#8B6FF7",
          violetDim: "#6F56D9",
          violetSoft: "#9B82FF",
        },
        audio: {
          mint: "#38D9C5",
          mintDim: "#2BB8A6",
        },
        ink: {
          primary: "#F5F5F7",
          muted: "#9299AD",
          faint: "#6F768A",
        },
        state: {
          amber: "#E6C45A",
          rose: "#FF6B7A",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.02) inset, 0 20px 50px -24px rgba(0,0,0,0.65)",
        glowViolet: "0 0 0 1px rgba(155,124,255,0.25), 0 8px 30px -8px rgba(155,124,255,0.35)",
        glowMint: "0 0 0 1px rgba(94,234,212,0.25), 0 8px 30px -8px rgba(94,234,212,0.28)",
      },
      backgroundImage: {
        "aurora-violet": "radial-gradient(60% 60% at 30% 0%, rgba(139,111,247,0.12) 0%, rgba(139,111,247,0) 60%)",
        "aurora-mint": "radial-gradient(50% 50% at 100% 0%, rgba(56,217,197,0.06) 0%, rgba(56,217,197,0) 60%)",
        "grain": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        eq: {
          "0%, 100%": { transform: "scaleY(0.25)" },
          "50%": { transform: "scaleY(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(56,217,197,0.30)" },
          "100%": { boxShadow: "0 0 0 8px rgba(56,217,197,0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        eq1: "eq 0.9s ease-in-out infinite",
        eq2: "eq 1.15s ease-in-out infinite",
        eq3: "eq 0.75s ease-in-out infinite",
        eq4: "eq 1.35s ease-in-out infinite",
        eq5: "eq 1.0s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-up": "fade-up 0.35s ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
