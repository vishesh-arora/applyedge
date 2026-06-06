import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0F4C81",
          accent: "#F5A623",
          light: "#EEF4FB",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["DM Serif Display", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
