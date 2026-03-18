import React from "react";
import {
  TouchableOpacity,
  Text,
  ViewStyle,
  ActivityIndicator,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { theme } from "../../theme";

interface PrimaryButtonProps {
  title: string;
  onPress?: () => void;
  variant?: "gradient" | "glass" | "danger" | "outline";
  className?: string;
  style?: ViewStyle;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
}

export function PrimaryButton({
  title,
  onPress,
  variant = "gradient",
  className,
  style,
  disabled = false,
  loading = false,
  loadingText,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const displayText = loading && loadingText ? loadingText : title;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  if (variant === "gradient") {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={isDisabled}
        style={[{ opacity: isDisabled ? 0.5 : 1 }, style]}
        className={className}
      >
        <LinearGradient
          colors={["#D97706", "#F59E0B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 9999, paddingVertical: 16, alignItems: "center" }}
        >
          <View className="flex-row items-center justify-center">
            {loading && (
              <ActivityIndicator
                color="#FFFFFF"
                size="small"
                style={{ marginRight: 8 }}
              />
            )}
            <Text className="text-white font-bold text-base">
              {displayText}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyles: Record<
    string,
    { bg: string; textColor: string; borderColor?: string }
  > = {
    glass: {
      bg: "rgba(217,119,6,0.1)",
      textColor: "#D97706",
    },
    danger: {
      bg: theme.colors.semantic.red,
      textColor: "#FFFFFF",
    },
    outline: {
      bg: "rgba(217,119,6,0.1)",
      textColor: "#D97706",
      borderColor: "rgba(217,119,6,0.2)",
    },
  };

  const v = variantStyles[variant];

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={isDisabled}
      className={className}
      style={[
        {
          backgroundColor: v.bg,
          borderRadius: 9999,
          paddingVertical: 16,
          alignItems: "center",
          opacity: isDisabled ? 0.5 : 1,
          borderWidth: v.borderColor ? 1 : 0,
          borderColor: v.borderColor,
        },
        style,
      ]}
    >
      <View className="flex-row items-center justify-center">
        {loading && (
          <ActivityIndicator
            color={v.textColor}
            size="small"
            style={{ marginRight: 8 }}
          />
        )}
        <Text style={{ color: v.textColor }} className="font-bold text-base">
          {displayText}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
