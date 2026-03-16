import React from "react";
import { Text } from "react-native";

interface SectionLabelProps {
  label: string;
  className?: string;
}

export function SectionLabel({ label, className }: SectionLabelProps) {
  return (
    <Text className={`text-text-muted text-xs uppercase tracking-widest font-medium ${className ?? ""}`}>
      {label}
    </Text>
  );
}
