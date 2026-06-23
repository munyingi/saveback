import type { Config } from "tailwindcss";

// Palette and type pulled straight from the prototype (saveback-app.jsx).
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#10241B",
        muted: "#6A7A70",
        paper: "#E9EFE7",
        surface: "#FFFFFF",
        "surface-2": "#F4F7F2",
        line: "#E3E9E2",
        save: {
          DEFAULT: "#0CA86C",
          press: "#0A8C5A",
          soft: "#E3F6EC",
        },
        boost: {
          DEFAULT: "#DC8A1F",
          soft: "#FBEED6",
        },
        danger: "#C8503A",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        phone: "34px",
      },
      maxWidth: {
        phone: "412px",
      },
    },
  },
  plugins: [],
};

export default config;
