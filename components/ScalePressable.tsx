import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

type Props = PressableProps & {
  scale?: number;
  animatedStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export function ScalePressable({
  children,
  onPressIn,
  onPressOut,
  scale = 0.96,
  style,
  animatedStyle,
  ...rest
}: Props) {
  const sv = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: sv.value }],
  }));

  return (
    <Pressable
      onPressIn={(e) => {
        sv.value = withSpring(scale, { damping: 10, stiffness: 400 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        sv.value = withSpring(1, { damping: 12, stiffness: 300 });
        onPressOut?.(e);
      }}
      {...rest}
    >
      <Animated.View style={[anim, animatedStyle, style as StyleProp<ViewStyle>]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
