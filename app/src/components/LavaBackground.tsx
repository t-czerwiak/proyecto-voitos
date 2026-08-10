import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

function LavaBlob({
  size,
  color,
  duration,
  initialX,
  initialY,
}: {
  size: number;
  color: string;
  duration: number;
  initialX: number;
  initialY: number;
}) {
  const posX = useSharedValue(initialX);
  const posY = useSharedValue(initialY);
  const rotation = useSharedValue(0);

  useEffect(() => {
    posX.value = withRepeat(
      withTiming(Math.random() * width, {
        duration: duration + 3000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    posY.value = withRepeat(
      withTiming(Math.random() * height, {
        duration,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    rotation.value = withRepeat(
      withTiming(360, {
        duration: duration + 5000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: posX.value - size / 2 },
      { translateY: posY.value - size / 2 },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.blob,
        {
          width: size,
          height: size * 0.9,
          backgroundColor: color,
          borderTopLeftRadius: size * 0.45,
          borderTopRightRadius: size * 0.55,
          borderBottomLeftRadius: size * 0.5,
          borderBottomRightRadius: size * 0.4,
          shadowColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function LavaBackground() {
  return (
    <LinearGradient
      colors={["#002b11", "#021108", "#000000"]}
      style={StyleSheet.absoluteFill}
    >
      <View style={StyleSheet.absoluteFill}>
        <LavaBlob
          size={320}
          color="#00FF7F"
          duration={12000}
          initialX={width * 0.2}
          initialY={height * 0.1}
        />

        <LavaBlob
          size={260}
          color="#90EE90"
          duration={15000}
          initialX={width * 0.7}
          initialY={height * 0.4}
        />

        <LavaBlob
          size={350}
          color="#32CD32"
          duration={18000}
          initialX={width * 0.4}
          initialY={height * 0.8}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    opacity: 0.12,

    shadowRadius: 65,
    shadowOpacity: 1,
    elevation: 20,
  },
});