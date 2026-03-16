export const theme = {
  colors: {
    bg: {
      primary: "#0D1117",
      surface: "#161B22",
      elevated: "#21262D",
      gradient: {
        top: "#0f172a",
        middle: "#1e293b",
        bottom: "#1c1917",
      },
    },
    accent: "#C4A574",
    accentSoft: "#E8DCC8",
    text: {
      primary: "#F8FAFC",
      secondary: "#94A3B8",
      muted: "#64748B",
    },
    semantic: {
      green: "#4ADE80",
      amber: "#FCD34D",
      red: "#FCA5A5",
      lockRed: "#ff3b30",
    },
    glass: {
      border: "rgba(255,255,255,0.06)",
      fill: "rgba(255,255,255,0.03)",
    },
  },
  radius: {
    card: 20,
    pill: 28,
    full: 9999,
  },
  blur: {
    intensity: 30,
  },
} as const;
