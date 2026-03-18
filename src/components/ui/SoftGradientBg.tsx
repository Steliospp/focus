import React from "react";
import { View } from "react-native";

interface SoftGradientBgProps {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
  warm?: boolean;
}

export function SoftGradientBg({ children, className, dark = false }: SoftGradientBgProps) {
  return (
    <View
      className={`flex-1 ${className ?? ""}`}
      style={{ backgroundColor: dark ? "#1C1917" : "#FAF8F4" }}
    >
      {children}
    </View>
  );
}
