import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#FAFAF7",
          surface: "#ffffff",
          elevated: "#F5F5F2",
          border: "#EAEAEA",
          mist: "#E0E0E0",
        },
        ink: {
          DEFAULT: "#111111",
          heading: "#111111",
          muted: "#6B7280",
          subtle: "#9CA3AF",
        },
        brand: {
          DEFAULT: "#111111",
          50: "#F7FFD6",
          100: "#EFFF8A",
          200: "#DFFF57",
          300: "#111111",
          400: "#111111",
          500: "#111111",
          600: "#000000",
          lime: "#DFFF57",
          "lime-soft": "#EFFF8A",
          "lime-glow": "#D4F54A",
        },
        accent: {
          cyan: "#06b6d4",
          violet: "#5e4cff",
          amber: "#f59e0b",
          emerald: "#16a34a",
          rose: "#dc2626",
          yellow: "#DFFF57",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        shell: "24px",
        pill: "999px",
      },
      boxShadow: {
        shell: "0 1px 3px rgba(0,0,0,0.04)",
        subtle: "0 1px 3px rgba(0,0,0,0.04)",
        card: "0 4px 24px rgba(0,0,0,0.06)",
        float: "0 12px 40px rgba(0,0,0,0.08)",
        glow: "0 0 0 1px #EAEAEA, 0 8px 32px rgba(223,255,87,0.15)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "24px 24px",
      },
    },
  },
  plugins: [],
};

export default config;