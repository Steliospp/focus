/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./index.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0A0A0F",
          surface: "#141419",
          elevated: "#1C1C24",
        },
        accent: "#D4A574",
        text: {
          primary: "#F5F5F7",
          secondary: "#A0A0AB",
          muted: "#6B6B78",
        },
        semantic: {
          green: "#4ADE80",
          amber: "#FBBF24",
          red: "#F87171",
        },
        glass: {
          border: "rgba(255,255,255,0.08)",
          fill: "rgba(255,255,255,0.04)",
        },
      },
      borderRadius: {
        card: "16px",
        pill: "24px",
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
