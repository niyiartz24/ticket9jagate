import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral, professional palette. No neon, no gradients-as-decoration.
        gate: {
          bg: "#0B0D10",
          surface: "#14171B",
          surfaceRaised: "#1B1F24",
          border: "#262B31",
          text: "#F3F4F5",
          textMuted: "#9AA1A9",
        },
        success: { DEFAULT: "#16A34A", bg: "#0F2418" },
        warning: { DEFAULT: "#D97706", bg: "#2B1F0C" },
        danger: { DEFAULT: "#DC2626", bg: "#2A1212" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
