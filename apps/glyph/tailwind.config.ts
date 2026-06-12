import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        glyph: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        clinical: {
          bg: "#f8fafc",
          surface: "#ffffff",
          border: "#e2e8f0",
          text: "#0f172a",
          muted: "#64748b",
        },
        red_flag: "#dc2626",
        /* Landing page palette — warm editorial paper + deep clinical ink */
        paper: {
          DEFAULT: "#faf8f2",
          deep: "#f1ecdf",
          line: "#e3dcc9",
        },
        ink: {
          DEFAULT: "#15241c",
          soft: "#41524a",
          faint: "#71807a",
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
        /* Landing display faces — editorial serifs, Latin + Bangla */
        display: ["Fraunces", "Georgia", "serif"],
        "display-bn": ["Tiro Bangla", "Noto Sans Bengali", "serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "orb-glow": "orb-glow 2s ease-in-out infinite alternate",
        shimmer: "shimmer 2s infinite",
      },
      keyframes: {
        "orb-glow": {
          "0%": { boxShadow: "0 0 20px rgba(34, 197, 94, 0.3)" },
          "100%": { boxShadow: "0 0 40px rgba(34, 197, 94, 0.6)" },
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
