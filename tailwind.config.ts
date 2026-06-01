import type { Config } from "tailwindcss";

/**
 * Luxe Ivory & Gold design tokens — per the brand guide.
 * Palette: ivory/cream base, warm beige cards, soft metallic gold accent,
 * deep charcoal text & structure. Ratios ~ ivory 60 / beige 20 / gold 10-15 / charcoal 10.
 * Type: elegant serif (Playfair Display) for headings, clean sans (Inter) for body.
 *
 * Token names are kept stable (navy/gold/paper/ink) so existing classNames
 * don't churn; `navy` now carries the charcoal "text & structure" role from
 * the guide (headings, dark sections, footer).
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
          DEFAULT: "#2C2C2C", // deep charcoal — body text
          soft: "#4a4a4a",
          muted: "#8a8a8a",
        },
        navy: {
          // Charcoal "structure" role: headings, nav bar, dark sections.
          DEFAULT: "#2C2C2C",
          900: "#1F1F1F", // dark-mode background
          800: "#262626",
          700: "#333333",
        },
        gold: {
          DEFAULT: "#C9A96E", // soft metallic gold — primary accent & CTAs
          soft: "#D8BE8A",
          // Darker gold for small text/links on the ivory base. #806124 hits
          // ~4.6:1 on #F8F4EE (WCAG AA for small text); the prior #A8884E failed.
          deep: "#806124",
        },
        // Brand-aligned status colors (warm, not stock red/amber).
        error: {
          DEFAULT: "#9B3A2E", // muted terracotta — AA on light backgrounds
          soft: "#FBEDEA",    // tint for error backgrounds
        },
        warning: {
          DEFAULT: "#8A6D1F", // deep amber-gold — readable on light
          soft: "#F6ECD6",    // tint for warning/compliance backgrounds
        },
        paper: {
          DEFAULT: "#F8F4EE", // ivory / cream — main background
          card: "#EDE4D5", // warm beige — cards, subtle sections
          line: "#F0F0F0", // light gray — dividers
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
        card: "0 1px 2px rgba(44,44,44,0.04), 0 12px 32px -12px rgba(44,44,44,0.18)",
        lift: "0 24px 60px -24px rgba(44,44,44,0.35)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
