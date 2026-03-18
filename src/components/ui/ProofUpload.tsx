import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";

interface ProofUploadProps {
  label: string;
  imageUri: string | null;
  onImageSelect: (uri: string) => void;
  onClear?: () => void;
}

export function ProofUpload({
  label,
  imageUri,
  onImageSelect,
  onClear,
}: ProofUploadProps) {
  const handlePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      onImageSelect(result.assets[0].uri);
    }
  };

  if (imageUri) {
    return (
      <View style={{ borderRadius: 20, overflow: "hidden" }}>
        <Image
          source={{ uri: imageUri }}
          style={{ width: "100%", height: 200, borderRadius: 20 }}
          resizeMode="cover"
        />
        {onClear && (
          <TouchableOpacity
            onPress={onClear}
            activeOpacity={0.7}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              backgroundColor: "rgba(0,0,0,0.5)",
              borderRadius: 14,
              width: 28,
              height: 28,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={handlePick}>
      <View
        style={{
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: "rgba(217,119,6,0.25)",
          borderRadius: 20,
          paddingVertical: 36,
          paddingHorizontal: 24,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(217,119,6,0.04)",
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "rgba(217,119,6,0.1)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Ionicons
            name="camera-outline"
            size={28}
            color={theme.colors.accent}
          />
        </View>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: theme.colors.text.primary,
            textAlign: "center",
            marginBottom: 4,
          }}
        >
          Tap to take photo
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: theme.colors.text.secondary,
            textAlign: "center",
            lineHeight: 18,
          }}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
