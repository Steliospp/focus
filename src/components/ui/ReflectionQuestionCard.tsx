import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { theme } from "../../theme";
import { fonts } from "../../constants/fonts";

interface ReflectionQuestionCardProps {
  question: string;
  options: string[];
  selectedOption: string | null;
  onSelect?: (option: string) => void;
  currentIndex: number;
  totalCount: number;
}

export function ReflectionQuestionCard({
  question,
  options,
  selectedOption,
  onSelect,
  currentIndex,
  totalCount,
}: ReflectionQuestionCardProps) {
  return (
    <View
      style={{
        paddingVertical: 24,
        paddingHorizontal: 4,
      }}
    >
      {/* Navigation dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 20 }}>
        {Array.from({ length: totalCount }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor:
                i <= currentIndex
                  ? theme.colors.accent
                  : theme.colors.text.muted,
              marginHorizontal: 3,
            }}
          />
        ))}
      </View>

      {/* Question */}
      <Text
        style={{
          fontFamily: fonts.heading,
          fontSize: 22,
          color: theme.colors.text.primary,
          textAlign: "center",
          marginBottom: 24,
          lineHeight: 30,
        }}
      >
        {question}
      </Text>

      {/* Options as simple text rows */}
      {options.map((option) => {
        const isSelected = selectedOption === option;

        return (
          <TouchableOpacity
            key={option}
            activeOpacity={onSelect ? 0.7 : 1}
            onPress={onSelect ? () => onSelect(option) : undefined}
            disabled={!onSelect}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 8,
            }}
          >
            {/* Circle indicator */}
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: isSelected ? theme.colors.accent : theme.colors.text.muted,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              {isSelected && (
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: theme.colors.accent,
                  }}
                />
              )}
            </View>
            <Text
              style={{
                fontFamily: fonts.body,
                color: theme.colors.text.primary,
                fontSize: 16,
                flex: 1,
              }}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
