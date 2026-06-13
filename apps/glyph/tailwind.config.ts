import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* ANCHORED DESIGN (2026-06-13): the app inherits the marketing
           site's "quiet clinical" system at token level. The glyph scale
           is remapped — light end is the lime accent family, dark end is
           ink — so existing `bg-glyph-600 text-white` buttons become ink
           pills and `bg-glyph-50` tints become pale lime, everywhere,
           without touching screens. Usage pattern preserved:
           600 = primary action (dark), 700 = hover (softer), 800 = active. */
        glyph: {
          50: "#fafce8",
          100: "#f4f8d0",
          200: "#ecf3ab",
          300: "#e7f280",
          400: "#dff258",
          500: "#d3e83f",
          600: "#171a19",
          700: "#3a423f",
          800: "#0e1110",
          900: "#090b0a",
          950: "#050606",
        },
        clinical: {
          bg: "#f4f5f3",
          surface: "#ffffff",
          border: "#e2e4e0",
          text: "#171a19",
          muted: "#4e5755",
        },
        /* Raw slate-* usages across app screens are remapped to the
           anchored warm-neutral ramp (bone → ink) so the whole app
           re-skins at the engine, not per screen. */
        slate: {
          50: "#f4f5f3",
          100: "#edefec",
          200: "#e2e4e0",
          300: "#cdd1cc",
          400: "#7e8784",
          500: "#5d6663",
          600: "#4e5755",
          700: "#353c3a",
          800: "#232826",
          900: "#171a19",
          950: "#0e1110",
        },
        red_flag: "#dc2626",
        /* Landing palette — sampled from the founder's reference image:
           canvas #F6F6F6, backdrop steel-teal #9DB7B8, accent #DFF258 */
        ink: {
          DEFAULT: "#171a19",
          soft: "#4e5755",
          faint: "#7e8784",
        },
        bone: {
          DEFAULT: "#f4f5f3",
          raise: "#fbfbfa",
          line: "#e2e4e0",
        },
        lime: {
          DEFAULT: "#dff258",
          deep: "#c4dd2e",
        },
        /* CSS-variable-driven semantic colors (set in globals.css :root) */
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans Bengali", "sans-serif"],
        bangla: ["Noto Sans Bengali", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        /* Landing display face — refined grotesque, sentence-case */
        display: ["Instrument Sans", "Inter", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "orb-glow": "orb-glow 2s ease-in-out infinite alternate",
        shimmer: "shimmer 2s infinite",
      },
      keyframes: {
        "orb-glow": {
          "0%": { boxShadow: "0 0 20px rgba(223, 242, 88, 0.45)" },
          "100%": { boxShadow: "0 0 44px rgba(211, 232, 63, 0.8)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
