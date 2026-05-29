import type { Config } from "tailwindcss";

/**
 * Editorial / luxury design tokens.
 * Palette: deep navy + warm charcoal grounds, ivory paper, brushed-gold accent.
 * Type: serif display (Fraunces) for headings, refined sans (Inter) for body.
 * These mirror the Figma design-system tokens so code and design stay in sync.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#11151c", // near-black charcoal text
          soft: "#3a4250",
          muted: "#6b7480",
        },
        navy: {
          DEFAULT: "#0e1a2b", // deep editorial navy
          900: "#0a1320",
          800: "#13243a",
          700: "#1d3454",
        },
        gold: {
          DEFAULT: "#b08d4f", // brushed gold accent
          soft: "#c9a86a",
          deep: "#8a6d39",
        },
        paper: {
          DEFAULT: "#f7f4ee", // ivory
          card: "#fffdf9",
          line: "#e7e1d6",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        editorial: "0.18em",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,21,28,0.04), 0 12px 32px -12px rgba(16,21,28,0.18)",
        lift: "0 24px 60px -24px rgba(14,26,43,0.45)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
