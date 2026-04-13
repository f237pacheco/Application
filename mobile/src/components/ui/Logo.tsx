import { Text, View } from 'react-native';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-5xl',
  xl: 'text-6xl',
};

export function Logo({ size = 'md' }: LogoProps) {
  return (
    <View className="flex-row items-center">
      <Text className={`font-bold tracking-tight ${sizes[size]} text-primary-500`}>V</Text>
      <Text className={`font-bold tracking-tight ${sizes[size]} text-white`}>elona</Text>
    </View>
  );
}
