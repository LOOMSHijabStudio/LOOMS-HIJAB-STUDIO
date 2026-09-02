import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {
    colors: { looms: { black: "#000000", white: "#FFFFFF", offwhite: "#F7F7F5", lightgray: "#E5E5E5", darkgray: "#222222", cream: "#FFFFFF", gray: "#222222", teal: "#000000" } },
    fontFamily: { display: ["var(--font-display)", "Georgia", "serif"], sans: ["var(--font-poppins)", "Arial", "sans-serif"] },
  } },
  plugins: [],
};
export default config;
