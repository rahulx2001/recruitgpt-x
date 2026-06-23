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
        canvas: "#ffffff",
        surface: "#ffffff",
        subtle: "#f7f7f8",
        elevated: "#ffffff",
        line: "#ececee",
        "line-strong": "#d9d9de",
        ink: {
          DEFAULT: "#17191c",
          secondary: "#4c4c4c",
          muted: "#777b86",
          faint: "#a3a6af",
        },
        accent: {
          DEFAULT: "#5d2a1a",
          hover: "#4a2215",
          soft: "#fbe1d1",
          ring: "rgba(93, 42, 26, 0.2)",
        },
        rust: "#5d2a1a",
        fog: "#f7f7f8",
        ash: "#4c4c4c",
        graphite: "#777b86",
        dove: "#a3a6af",
        apricot: "#fbe1d1",
        sky: "#d3e3fc",
        cool: { DEFAULT: "#5b8def", soft: "#d3e3fc" },
        positive: { DEFAULT: "#2d7a4f", soft: "#e8f5ec" },
        warning: { DEFAULT: "#b45309", soft: "#fef3e2" },
        critical: { DEFAULT: "#c0392b", soft: "#fdecea" },
        info: { DEFAULT: "#5b8def", soft: "#d3e3fc" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: [
          "var(--font-display)",
          "Source Serif 4",
          "Georgia",
          "serif",
        ],
        mono: ["var(--font-mono)", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "14px", letterSpacing: "-0.009em" }],
      },
      borderRadius: {
        card: "20px",
        panel: "14px",
        chip: "10px",
        lg: "14px",
        md: "12px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(23, 25, 28, 0.04)",
        sm: "0 1px 2px rgba(23, 25, 28, 0.04)",
        card: "0 1px 2px rgba(23, 25, 28, 0.04), 0 1px 3px rgba(23, 25, 28, 0.06)",
        float: "0 8px 24px rgba(23, 25, 28, 0.08)",
        ring: "0 0 0 1px #ececee",
      },
      letterSpacing: {
        body: "-0.009em",
        display: "-0.025em",
        heading: "-0.015em",
      },
      maxWidth: {
        site: "1200px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-dot": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.15)", opacity: "0.85" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "bar-grow": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        "meter-fill": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.2s ease both",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "bar-grow": "bar-grow 0.9s cubic-bezier(0.16,1,0.3,1) both",
        "meter-fill": "meter-fill 0.8s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;