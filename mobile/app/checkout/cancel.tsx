import { View, Text, SafeAreaView, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

export default function CheckoutCancelScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ plan?: string; service?: string }>();

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      <View className="flex-1 items-center justify-center px-6 gap-7">
        <Text className="text-6xl">😕</Text>

        <View className="items-center gap-2">
          <Text className="text-2xl font-bold text-white text-center">Paiement annulé</Text>
          <Text className="text-gray-400 text-sm text-center leading-relaxed">
            Votre paiement a été annulé. Aucun montant n'a été débité. Vous pouvez réessayer à tout moment.
          </Text>
        </View>

        <View className="w-full gap-3">
          <Button
            onPress={() => router.push('/checkout/payment' as never)}
            label="Réessayer le paiement"
            size="lg"
            fullWidth
          />
          <Button
            onPress={() => router.replace('/(dashboard)/home')}
            label="Revenir au dashboard"
            variant="secondary"
            size="lg"
            fullWidth
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
