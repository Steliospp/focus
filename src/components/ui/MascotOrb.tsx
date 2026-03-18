import React, { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";

type OrbMood = "default" | "happy" | "warning" | "locked" | "celebration" | "sad";

interface MascotOrbProps {
  mood?: OrbMood;
  size?: number;
}

interface MoodColors {
  inner: string;
  middle: string;
  outer: string;
}

const MOOD_COLORS: Record<OrbMood, MoodColors> = {
  default: { inner: "#F59E0B", middle: "#FCD34D", outer: "#FDE68A" },
  happy: { inner: "#84CC16", middle: "#BEF264", outer: "#D9F99D" },
  warning: { inner: "#D97706", middle: "#F59E0B", outer: "#FCD34D" },
  locked: { inner: "#292524", middle: "#44403C", outer: "#57534E" },
  celebration: { inner: "#F59E0B", middle: "#FCD34D", outer: "#FDE68A" },
  sad: { inner: "#A8A29E", middle: "#D6D3D1", outer: "#E7E5E4" },
};

export function MascotOrb({ mood = "default", size = 80 }: MascotOrbProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0.4)).current;
  const outerScaleAnim = useRef(new Animated.Value(1)).current;
  const animsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    // Stop all current animations
    animsRef.current.forEach((a) => a.stop());
    animsRef.current = [];

    // Reset all animated values
    scaleAnim.setValue(1);
    translateYAnim.setValue(0);
    rotateAnim.setValue(0);
    opacityAnim.setValue(0.4);
    outerScaleAnim.setValue(1);

    const anims: Animated.CompositeAnimation[] = [];

    // Outer ring breathing opacity (always present)
    const baseOpacity = mood === "locked" ? 0.3 : 0.4;
    const lowOpacity = mood === "locked" ? 0.2 : 0.28;
    const breathDuration = mood === "sad" ? 5000 : 3000;

    const opacityBreathing = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: lowOpacity,
          duration: breathDuration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: baseOpacity,
          duration: breathDuration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    opacityAnim.setValue(baseOpacity);
    anims.push(opacityBreathing);

    switch (mood) {
      case "default": {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.06,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.0,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
        anims.push(pulse);
        break;
      }

      case "happy": {
        const bounce = Animated.sequence([
          Animated.spring(translateYAnim, {
            toValue: -12,
            useNativeDriver: true,
            speed: 12,
            bounciness: 8,
          }),
          Animated.spring(translateYAnim, {
            toValue: 0,
            useNativeDriver: true,
            speed: 12,
            bounciness: 8,
          }),
          Animated.spring(translateYAnim, {
            toValue: -6,
            useNativeDriver: true,
            speed: 12,
            bounciness: 8,
          }),
          Animated.spring(translateYAnim, {
            toValue: 0,
            useNativeDriver: true,
            speed: 12,
            bounciness: 8,
          }),
        ]);
        const repeatedBounce = Animated.loop(bounce, { iterations: 3 });
        anims.push(repeatedBounce);
        break;
      }

      case "warning": {
        const fastPulse = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.06,
              duration: 750,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.0,
              duration: 750,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
        anims.push(fastPulse);
        break;
      }

      case "locked": {
        const slowPulse = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.03,
              duration: 2500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.0,
              duration: 2500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
        anims.push(slowPulse);
        break;
      }

      case "celebration": {
        // Outer ring grows to 2.5x base
        outerScaleAnim.setValue(1);
        const outerGrow = Animated.loop(
          Animated.sequence([
            Animated.timing(outerScaleAnim, {
              toValue: 1.25,
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(outerScaleAnim, {
              toValue: 1.0,
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );

        // Slow rotation
        const spin = Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );

        // Scale pulse
        const scalePulse = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.2,
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.0,
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );

        anims.push(outerGrow, spin, scalePulse);
        break;
      }

      case "sad": {
        translateYAnim.setValue(4);
        const fadePulse = Animated.loop(
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0.2,
              duration: 3000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.4,
              duration: 3000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
        // Replace the default opacity breathing for sad
        anims.pop(); // remove the default breathing added above
        anims.push(fadePulse);
        break;
      }
    }

    animsRef.current = anims;
    anims.forEach((a) => a.start());

    return () => {
      anims.forEach((a) => a.stop());
    };
  }, [mood]);

  const colors = MOOD_COLORS[mood];

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const containerSize = size * 2.2;
  const outerSize = size * 2;
  const middleSize = size * 1.5;
  const innerSize = size;

  return (
    <View
      style={{
        width: containerSize,
        height: containerSize,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Outer ring */}
      <Animated.View
        style={{
          position: "absolute",
          width: outerSize,
          height: outerSize,
          borderRadius: outerSize / 2,
          backgroundColor: colors.outer,
          opacity: opacityAnim,
          transform: [
            { scale: Animated.multiply(scaleAnim, outerScaleAnim) },
            { rotate },
          ],
        }}
      />

      {/* Middle ring */}
      <Animated.View
        style={{
          position: "absolute",
          width: middleSize,
          height: middleSize,
          borderRadius: middleSize / 2,
          backgroundColor: colors.middle,
          opacity: 0.6,
          transform: [{ translateY: translateYAnim }, { rotate }],
        }}
      />

      {/* Inner core */}
      <Animated.View
        style={{
          position: "absolute",
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: colors.inner,
          transform: [{ translateY: translateYAnim }, { rotate }],
        }}
      />
    </View>
  );
}
