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
          primary: "#0D1117",
          surface: "#161B22",
          elevated: "#21262D",
          "gradient-top": "#0f172a",
          "gradient-bottom": "#1c1917",
        },
        accent: "#C4A574",
        "accent-soft": "#E8DCC8",
        text: {
          primary: "#F8FAFC",
          secondary: "#94A3B8",
          muted: "#64748B",
        },
        semantic: {
          green: "#86EFAC",
          amber: "#FCD34D",
          red: "#FCA5A5",
        },
        glass: {
          border: "rgba(255,255,255,0.06)",
          fill: "rgba(255,255,255,0.03)",
        },
      },
      borderRadius: {
        card: "20px",
        pill: "28px",
        "card-lg": "24px",
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
