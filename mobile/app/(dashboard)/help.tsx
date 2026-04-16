import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';

const FAQ_ITEMS = [
  {
    q: 'Qu\'est-ce que Velona ?',
    a: 'Velona est une plateforme de services IA pour les entreprises et les particuliers. Créez des sites web, gérez vos RDV, montez des vidéos et plus encore.',
  },
  {
    q: 'Comment fonctionne l\'essai gratuit ?',
    a: 'Chaque abonnement inclut 3 jours d\'essai gratuit. Vous n\'êtes débité qu\'après la période d\'essai. Annulez à tout moment depuis votre compte.',
  },
  {
    q: 'Quelle est la différence entre Starter et Pro ?',
    a: 'Starter : 2 services, 5 générations/mois. Pro : tous les services, 30 générations/mois, support prioritaire.',
  },
  {
    q: 'Comment annuler mon abonnement ?',
    a: 'Dans Compte → Gérer l\'abonnement, accédez au portail Stripe pour annuler. L\'accès reste actif jusqu\'à la fin de la période payée.',
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Oui, toutes les données sont chiffrées (SSL/TLS). Les paiements sont gérés par Stripe/PayPal — vos infos bancaires ne sont jamais stockées chez nous.',
  },
  {
    q: 'Le programme partenaire, comment ça marche ?',
    a: 'Partagez Velona et soumettez votre lien dans la section Compte → Partenaire. Après validation (24-48h) : 1 mois offert ou upgrade de plan.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      onPress={() => setOpen((v) => !v)}
      activeOpacity={0.7}
      className="border-b border-gray-800 last:border-0"
    >
      <View className="flex-row items-center justify-between py-4 gap-3">
        <Text className="text-white text-sm font-medium flex-1">{q}</Text>
        <Text className="text-gray-500 text-lg" style={{ transform: [{ rotate: open ? '45deg' : '0deg' }] }}>
          +
        </Text>
      </View>
      {open && (
        <Text className="text-gray-400 text-sm pb-4 leading-relaxed">{a}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function HelpScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      {/* Header */}
      <View className="px-5 py-4 border-b border-gray-900">
        <Text className="text-xl font-bold text-white">{t('dashboard.help')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="gap-4">

          {/* FAQ */}
          <View className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Questions fréquentes
            </Text>
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </View>

          {/* Contact */}
          <View className="bg-gray-900 border border-gray-800 rounded-2xl p-5 gap-3">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nous contacter</Text>

            <TouchableOpacity
              onPress={() => Linking.openURL('mailto:support@velona.io')}
              activeOpacity={0.7}
              className="flex-row items-center gap-3 bg-gray-800 rounded-xl p-3"
            >
              <Text className="text-2xl">✉️</Text>
              <View>
                <Text className="text-white text-sm font-medium">support@velona.io</Text>
                <Text className="text-gray-500 text-xs">Réponse sous 24h en semaine</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL('mailto:hello@velona.io')}
              activeOpacity={0.7}
              className="flex-row items-center gap-3 bg-gray-800 rounded-xl p-3"
            >
              <Text className="text-2xl">💼</Text>
              <View>
                <Text className="text-white text-sm font-medium">hello@velona.io</Text>
                <Text className="text-gray-500 text-xs">Partenariats & entreprises</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Resources */}
          <View className="bg-gray-900 border border-gray-800 rounded-2xl p-5 gap-3">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ressources</Text>
            {[
              { icon: '📖', label: 'Documentation', sub: 'Guides et tutoriels' },
              { icon: '🔔', label: 'Status page', sub: 'État des services en temps réel' },
              { icon: '🔒', label: 'Confidentialité', sub: 'Comment nous protégeons vos données' },
            ].map(({ icon, label, sub }) => (
              <View key={label} className="flex-row items-center gap-3 bg-gray-800 rounded-xl p-3">
                <Text className="text-xl">{icon}</Text>
                <View>
                  <Text className="text-white text-sm font-medium">{label}</Text>
                  <Text className="text-gray-500 text-xs">{sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Version */}
          <Text className="text-center text-xs text-gray-700">Velona v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
