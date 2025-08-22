import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(18,19,22)",
        surface: "rgb(28,29,33)",
        text: {
          DEFAULT: "rgb(232,234,237)",
          muted: "rgb(144,148,160)"
        },
        accent: "hsl(265,85%,60%)"
      },
      borderRadius: { xl: "1rem" }
    }
  },
  plugins: []
} satisfies Config;
