export const theme = {
  colors: {
    bg: {
      primary: "#FAF8F4",
      surface: "#FAF8F4",
      elevated: "#FFFFFF",
      dark: "#1C1917",
      darkElevated: "rgba(250,248,244,0.08)",
    },
    accent: "#D97706",
    accentLight: "#F59E0B",
    accentSoft: "rgba(217,119,6,0.12)",
    text: {
      primary: "#1C1917",
      secondary: "#78716C",
      muted: "#A8A29E",
      light: "#FAF8F4",
      lightSecondary: "rgba(250,248,244,0.6)",
      lightMuted: "rgba(250,248,244,0.3)",
    },
    semantic: {
      green: "#84CC16",
      amber: "#F59E0B",
      red: "#EF4444",
    },
    status: {
      todo: "#78716C",
      active: "#F59E0B",
      completed: "#84CC16",
      late: "#EF4444",
      failed: "#A8A29E",
    },
    orb: {
      default: "#F59E0B",
      happy: "#84CC16",
      warning: "#D97706",
      locked: "#292524",
      celebrating: "#F59E0B",
      sad: "#A8A29E",
    },
    border: "#E7E5E4",
    divider: "#E7E5E4",
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 24,
    full: 9999,
  },
  shadow: {
    sm: {} as any,
    md: {} as any,
  },
} as const;
