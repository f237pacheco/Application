import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';

interface Stats {
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingSubmissions: number;
  promoUses: number;
}

interface Submission {
  id: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  reward_type: 'free_month' | 'plan_upgrade';
  created_at: string;
}

const STATUS_CONFIG = {
  pending:  { label: 'En attente', bg: '#F59E0B20', text: '#F59E0B' },
  approved: { label: 'Approuvé',   bg: '#00B89420', text: '#00B894' },
  rejected: { label: 'Refusé',     bg: '#EF444420', text: '#EF4444' },
};

const HOW_IT_WORKS = [
  { step: '01', title: 'Partagez Velona', desc: 'Publiez un avis ou un article avec votre code promo.' },
  { step: '02', title: 'Soumettez le lien', desc: 'Collez l\'URL de votre publication ci-dessous.' },
  { step: '03', title: 'Validation (24-48h)', desc: 'Notre équipe vérifie et valide votre soumission.' },
  { step: '04', title: 'Récompense', desc: '1 mois gratuit ou upgrade de plan automatiquement appliqué.' },
];

export default function PartnerScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();

  const [stats, setStats] = useState<Stats | null>(null);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const [partnerUrl, setPartnerUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  useEffect(() => {
    if (!session?.access_token) return;
    const headers = { Authorization: `Bearer ${session.access_token}` };

    Promise.all([
      fetch(`${apiUrl}/api/partner/stats`, { headers }).then((r) => r.json()),
      fetch(`${apiUrl}/api/partner/submissions`, { headers }).then((r) => r.json()),
      fetch(`${apiUrl}/api/auth/profile`, { headers }).then((r) => r.json()),
    ])
      .then(([s, subs, profile]) => {
        setStats(s);
        setSubmissions(Array.isArray(subs) ? subs : []);
        setPromoCode(profile?.promo_code ?? null);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [session, apiUrl]);

  const handleSubmit = async () => {
    if (!partnerUrl.trim()) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${apiUrl}/api/partner/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ url: partnerUrl.trim() }),
      });
      setSubmitStatus(res.ok ? 'success' : 'error');
      if (res.ok) {
        setPartnerUrl('');
        setSubmissions((prev) => [{
          id: Date.now().toString(),
          url: partnerUrl.trim(),
          status: 'pending',
          reward_type: 'free_month',
          created_at: new Date().toISOString(),
        }, ...prev]);
        setStats((s) => s ? { ...s, totalSubmissions: s.totalSubmissions + 1, pendingSubmissions: s.pendingSubmissions + 1 } : s);
      }
    } catch {
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      <View className="px-5 pt-4 border-b border-gray-900 pb-4">
        <BackButton />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {/* Title */}
        <View className="mb-5">
          <Text className="text-2xl font-bold text-white">{t('partner.title')}</Text>
          <Text className="text-gray-400 text-sm mt-1">{t('partner.description')}</Text>
        </View>

        <View className="gap-4">
          {/* Stats */}
          {stats && (
            <View className="flex-row gap-3">
              {[
                { label: 'Soumissions', value: stats.totalSubmissions, icon: '📨' },
                { label: 'Approuvées',  value: stats.approvedSubmissions, icon: '✅' },
                { label: 'Utilisations', value: stats.promoUses, icon: '🏷️' },
              ].map(({ label, value, icon }) => (
                <View key={label} className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-4 gap-1">
                  <Text className="text-xl">{icon}</Text>
                  <Text className="text-2xl font-extrabold text-white">{value}</Text>
                  <Text className="text-gray-500 text-xs">{label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Promo code card */}
          {promoCode && (
            <View
              className="rounded-2xl p-5 gap-3"
              style={{ backgroundColor: '#6C5CE710', borderWidth: 1, borderColor: '#6C5CE740' }}
            >
              <Text className="text-gray-400 text-xs uppercase tracking-wider">{t('partner.yourCode')}</Text>
              <Text className="text-3xl font-extrabold tracking-widest" style={{ color: '#B4A9F5', fontFamily: 'monospace' }}>
                {promoCode}
              </Text>
              <Text className="text-gray-500 text-xs">Partagez ce code — vos filleuls bénéficient de 10% de réduction</Text>
              <TouchableOpacity
                onPress={async () => {
                  const Clipboard = await import('expo-clipboard');
                  await Clipboard.setStringAsync(promoCode);
                }}
                className="border border-gray-700 rounded-xl px-4 py-2 self-start"
              >
                <Text className="text-gray-400 text-xs">Copier le code</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* How it works */}
          <View className="bg-gray-900 border border-gray-800 rounded-2xl p-5 gap-4">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Comment ça marche</Text>
            <View className="gap-3">
              {HOW_IT_WORKS.map(({ step, title, desc }) => (
                <View key={step} className="flex-row gap-3">
                  <Text className="text-xs font-bold mt-0.5" style={{ color: '#6C5CE7' }}>{step}</Text>
                  <View className="flex-1">
                    <Text className="text-white text-sm font-semibold">{title}</Text>
                    <Text className="text-gray-500 text-xs mt-0.5 leading-relaxed">{desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Submit form */}
          <View className="bg-gray-900 border border-gray-800 rounded-2xl p-5 gap-3">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('partner.submitLink')}</Text>
            <TextInput
              value={partnerUrl}
              onChangeText={(v) => { setPartnerUrl(v); setSubmitStatus('idle'); }}
              placeholder={t('partner.linkPlaceholder')}
              placeholderTextColor="#4B5563"
              keyboardType="url"
              autoCapitalize="none"
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm"
            />
            <Button
              onPress={handleSubmit}
              label={t('partner.submit')}
              size="sm"
              loading={submitting}
              disabled={!partnerUrl.trim()}
            />
            {submitStatus === 'success' && (
              <Text className="text-xs" style={{ color: '#00B894' }}>✓ Lien soumis ! Validation sous 24-48h.</Text>
            )}
            {submitStatus === 'error' && (
              <Text className="text-xs text-red-400">Erreur — lien déjà soumis ou URL invalide.</Text>
            )}
          </View>

          {/* Submissions list */}
          {submissions.length > 0 && (
            <View className="bg-gray-900 border border-gray-800 rounded-2xl p-5 gap-4">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mes soumissions</Text>
              <View className="gap-3">
                {submissions.map((sub) => {
                  const sc = STATUS_CONFIG[sub.status];
                  return (
                    <View key={sub.id} className="border-b border-gray-800 pb-3 last:border-0 last:pb-0 gap-1.5">
                      <Text className="text-primary-300 text-sm" numberOfLines={1}>{sub.url}</Text>
                      <View className="flex-row items-center gap-2">
                        <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: sc.bg }}>
                          <Text className="text-xs font-medium" style={{ color: sc.text }}>{sc.label}</Text>
                        </View>
                        <Text className="text-gray-600 text-xs">
                          {new Date(sub.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
