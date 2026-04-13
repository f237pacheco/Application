import { TouchableOpacity, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

interface BackButtonProps {
  href?: string;
  label?: string;
  onPress?: () => void;
}

export function BackButton({ href, label, onPress }: BackButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (href) {
      router.push(href as never);
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className="flex-row items-center gap-1 py-2"
    >
      <Text className="text-gray-400 text-lg">‹</Text>
      <Text className="text-gray-400 text-sm font-medium">
        {label ?? t('common.back')}
      </Text>
    </TouchableOpacity>
  );
}
