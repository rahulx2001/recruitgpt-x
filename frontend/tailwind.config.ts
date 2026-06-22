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
        line: "#a3a6af",
        "line-strong": "#8b8c8d",
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
        card: "24px",
        lg: "16px",
        md: "12px",
      },
      boxShadow: {
        xs: "rgba(4, 23, 43, 0.05) 0px 0px 0px 1px",
        sm: "rgba(4, 23, 43, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.06) 0px 4px 8px -2px",
        card: "rgba(4, 23, 43, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px",
        float: "rgba(4, 23, 43, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px",
        ring: "rgba(4, 23, 43, 0.05) 0px 0px 0px 1px",
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