import React, { useEffect, useRef } from "react";
import { View, Animated, Dimensions } from "react-native";

interface ParticleBurstProps {
  active: boolean;
  color?: string;
}

const PALETTE = ["#F59E0B", "#D97706", "#84CC16", "#FCD34D", "#EF4444"];
const PARTICLE_COUNT = 24;

interface Particle {
  translateX: Animated.Value;
  translateY: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
  angle: number;
  distance: number;
  duration: number;
}

function createParticles(): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 120;
    particles.push({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(1),
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      size: 6 + Math.random() * 4,
      angle,
      distance,
      duration: 800 + Math.random() * 400,
    });
  }
  return particles;
}

export function ParticleBurst({ active, color }: ParticleBurstProps) {
  const particles = useRef<Particle[]>(createParticles()).current;
  const { width, height } = Dimensions.get("window");
  const centerX = width / 2;
  const centerY = height / 2;

  useEffect(() => {
    if (!active) return;

    // Reset all particles
    particles.forEach((p) => {
      p.translateX.setValue(0);
      p.translateY.setValue(0);
      p.opacity.setValue(1);
      p.scale.setValue(1);
    });

    const animations = particles.map((p, index) => {
      const targetX = Math.cos(p.angle) * p.distance;
      const targetY = Math.sin(p.angle) * p.distance;

      return Animated.sequence([
        Animated.delay(index * 15),
        Animated.parallel([
          Animated.timing(p.translateX, {
            toValue: targetX,
            duration: p.duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.translateY, {
            toValue: targetY,
            duration: p.duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: p.duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.scale, {
            toValue: 0.3,
            duration: p.duration,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    const anim = Animated.parallel(animations);
    anim.start();

    return () => {
      anim.stop();
    };
  }, [active]);

  if (!active) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
      }}
    >
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: centerX - p.size / 2,
            top: centerY - p.size / 2,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: color || p.color,
            transform: [
              { translateX: p.translateX },
              { translateY: p.translateY },
              { scale: p.scale },
            ],
            opacity: p.opacity,
          }}
        />
      ))}
    </View>
  );
}
