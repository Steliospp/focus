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
          primary: "#e8f4f0",
          surface: "rgba(255,255,255,0.65)",
          elevated: "rgba(255,255,255,0.85)",
        },
        accent: "#7c5ceb",
        "accent-blue": "#5c8aeb",
        "accent-soft": "rgba(124,92,235,0.15)",
        text: {
          primary: "#1a1a2e",
          secondary: "rgba(0,0,0,0.45)",
          muted: "rgba(0,0,0,0.3)",
        },
        semantic: {
          green: "#1ea064",
          amber: "#f59e0b",
          red: "#dc3c3c",
        },
        glass: {
          border: "rgba(255,255,255,0.85)",
          fill: "rgba(255,255,255,0.65)",
        },
      },
      borderRadius: {
        card: "20px",
        pill: "28px",
        "card-lg": "28px",
      },
    },
  },
  plugins: [],
};
