import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          green: "#00ff88",
          red: "#ff3366",
          blue: "#0088ff",
          dark: "#0a0e1a",
          card: "#111827",
          border: "#1f2937",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "pulse-red": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        glitch: "glitch 0.3s infinite",
        "scan-line": "scanline 2s linear infinite",
      },
      keyframes: {
        glitch: {
          "0%, 100%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(2px, -2px)" },
          "60%": { transform: "translate(-2px, -2px)" },
          "80%": { transform: "translate(2px, 2px)" },
        },
        scanline: {
          "0%": { top: "0%" },
          "100%": { top: "100%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
