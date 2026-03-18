import React from "react";
import { Text } from "react-native";

interface SectionLabelProps {
  label: string;
  className?: string;
}

export function SectionLabel({ label, className }: SectionLabelProps) {
  return (
    <Text
      className={className ?? ""}
      style={{
        fontFamily: "DMSans-Medium",
        fontSize: 13,
        color: "#78716C",
      }}
    >
      {label}
    </Text>
  );
}
