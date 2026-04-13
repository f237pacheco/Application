import { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signInWithGoogle } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
      // Navigation is handled by AuthProvider via onAuthStateChange
    } catch {
      setError(t('auth.errors.googleFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      {/* Header */}
      <View className="px-5 pt-4">
        <BackButton href="/onboarding" />
      </View>

      {/* Content */}
      <View className="flex-1 items-center justify-center px-6">
        <Logo size="lg" />

        <View className="w-full mt-12 bg-gray-900 rounded-3xl border border-gray-800 p-8 gap-6">
          {/* Title */}
          <View className="items-center gap-2">
            <Text className="text-2xl font-bold text-white">
              {t('auth.title')}
            </Text>
            <Text className="text-gray-400 text-sm text-center">
              {t('auth.subtitle')}
            </Text>
          </View>

          {/* Error */}
          {error && (
            <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <Text className="text-red-400 text-sm text-center">{error}</Text>
            </View>
          )}

          {/* Google button */}
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.85}
            className="bg-white flex-row items-center justify-center gap-3 py-4 rounded-xl"
          >
            {!loading && (
              <Text className="text-2xl">G</Text>
            )}
            <Text className="text-gray-900 font-semibold text-base">
              {loading ? t('common.loading') : t('auth.googleBtn')}
            </Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text className="text-xs text-gray-600 text-center leading-relaxed">
            {t('auth.terms')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
