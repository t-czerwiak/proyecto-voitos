import React, { useRef } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";

interface MenuCardProps {
  title: string;
  image: any;
  onPress: () => void;
}


export default function MenuCard({
  title,
  image,
  onPress,
}: MenuCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  const hoverIn = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1.03,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hoverOut = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 20,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={hoverIn}
      onHoverOut={hoverOut}
    >
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale }],
          },
        ]}
      >
        <Image
          source={image}
          style={styles.image}
        />

        <Animated.View
          style={[
            styles.overlay,
            {
              opacity,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <Text style={styles.title}>{title}</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
    
  );
}

const styles = StyleSheet.create({
  card: {
    width: 350,
    height: 220,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#FFF",
    marginVertical: 20,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(80,80,80,0.55)",
  },

  textContainer: {
    position: "absolute",
    width: "100%",
    bottom: 20,
    alignItems: "center",
  },

  title: {
    color: "#FFF",
    fontSize: 30,
    fontWeight: "300",
  },
});