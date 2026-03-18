import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Pressable,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 180,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={onClose}
        >
          <Animated.View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              opacity: overlayAnim,
            }}
          />
        </Pressable>

        <Animated.View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            transform: [{ translateY: slideAnim }],
            backgroundColor: "#ffffff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? 40 : 24,
            paddingHorizontal: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(0,0,0,0.15)",
              alignSelf: "center",
              marginBottom: 20,
            }}
          />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
