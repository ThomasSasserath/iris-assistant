import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        iris: {
          bg: "#0f0f10",
          surface: "#1a1a1d",
          border: "#2a2a2e",
          accent: "#4a9eff",
          muted: "#6b7280",
          text: "#e8e8ea",
          subtext: "#9ca3af",
          high: "#ef4444",
          medium: "#f59e0b",
          low: "#6b7280",
          done: "#22c55e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
