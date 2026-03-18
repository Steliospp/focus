export const fonts = {
  heading: "CormorantGaramond-Italic",
  headingBold: "CormorantGaramond-SemiBoldItalic",
  body: "DMSans-Regular",
  bodyMedium: "DMSans-Medium",
  bodyLight: "DMSans-Light",
} as const;

export const textStyles = {
  hero: {
    fontFamily: fonts.heading,
    fontSize: 48,
    lineHeight: 52,
  },
  emotionalMoment: {
    fontFamily: fonts.heading,
    fontSize: 28,
    lineHeight: 34,
  },
  aiComment: {
    fontFamily: fonts.heading,
    fontSize: 18,
    lineHeight: 26,
    fontStyle: "italic" as const,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
} as const;
