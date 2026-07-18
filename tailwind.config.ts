import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Verdict palette — keep in sync with contracts.ts Verdict enum
        verdict: {
          verified: "#16a34a", // green
          off_guideline: "#d97706", // amber
          excluded: "#6b7280", // grey
          flagged: "#dc2626", // red (hard stop)
        },
      },
    },
  },
  plugins: [],
};

export default config;
