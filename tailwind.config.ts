import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Approved Brand Palette: Option A — Royal Heritage (docs/BRAND_UI_SPEC.md)
        plum: {
          50: "#fbf4f6",
          100: "#f5e4ea",
          200: "#edd0dc",
          300: "#dfadbf",
          400: "#cc7f9d",
          500: "#b5597f",
          600: "#8c3158",
          700: "#702747", // Royal Plum Primary
          800: "#5a1f39",
          900: "#45182c",
          DEFAULT: "#702747",
        },
        ivory: {
          50: "#fffefc",
          DEFAULT: "#FFF9F2", // Warm Ivory Background
          100: "#fdf5eb",
          200: "#f7e9d7",
          300: "#eed5bb",
        },
        gold: {
          50: "#fbf7ee",
          100: "#f6eed6",
          200: "#eddcb1",
          300: "#e1c385",
          400: "#d3ab65",
          500: "#C6A15B", // Antique Gold
          600: "#b38e47",
          700: "#9c7a39",
          DEFAULT: "#C6A15B",
        },
        rose: {
          50: "#fbf5f7",
          100: "#f6eaee",
          200: "#eccdd5",
          300: "#E8C7CF", // Dusty Rose
          DEFAULT: "#E8C7CF",
        },
        forest: {
          50: "#f2f6f4",
          100: "#e2ece7",
          200: "#c2d7cd",
          500: "#446257",
          600: "#344A42", // Forest Green Verified
          700: "#2a3d36",
          DEFAULT: "#344A42",
        },
        charcoal: {
          light: "#635e69",
          DEFAULT: "#45404A", // Charcoal Body Text
          dark: "#2d2931",
        },
        warmgrey: {
          DEFAULT: "#E9E2DA", // Warm Grey Form Borders
          light: "#F4EFEA",
          dark: "#D1C7BC",
        },
      },
      fontFamily: {
        devanagari: ["var(--font-noto-devanagari)", "sans-serif"],
        sans: ["var(--font-inter)", "var(--font-noto-devanagari)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
