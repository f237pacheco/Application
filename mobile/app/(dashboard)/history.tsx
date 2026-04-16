import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

interface OrderItem {
  id: string;
  service_type: string;
  prompt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result_url?: string;
  created_at: string;
  completed_at?: string;
}

const STATUS_CONFIG = {
  queued:     { label: 'En attente',   bg: 'bg-gray-800',       text: 'text-gray-400' },
  processing: { label: 'En cours',     bg: 'bg-yellow-500/20',  text: 'text-yellow-400' },
  completed:  { label: 'Terminé',      bg: 'bg-success-DEFAULT/20', text: 'text-success-DEFAULT' },
  failed:     { label: 'Échoué',       bg: 'bg-red-500/20',     text: 'text-red-400' },
};

const SERVICE_ICONS: Record<string, string> = {
  website:      '🌐',
  voice_agent:  '🎙️',
  video_editing:'🎬',
  appointments: '📅',
  social_media: '📱',
  analytics:    '📊',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();

  const [items, setItems] = useState<OrderItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchHistory = useCallback(async (p: number, append = false) => {
    if (!session?.access_token) return;
    try {
      if (append) setLoadingMore(true); else setLoading(true);
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/services/history?page=${p}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems((prev) => append ? [...prev, ...data.items] : data.items);
      setTotalPages(data.totalPages);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [session]);

  useEffect(() => { fetchHistory(1); }, [fetchHistory]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchHistory(next, true);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      {/* Header */}
      <View className="px-5 py-4 border-b border-gray-900">
        <Text className="text-xl font-bold text-white">{t('dashboard.history')}</Text>
      </View>

      {loading ? (
        <View className="flex-1 gap-3 px-4 pt-4">
          {[...Array(4)].map((_, i) => (
            <View key={i} className="h-20 rounded-2xl bg-gray-900 border border-gray-800" />
          ))}
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2 px-8">
          <Text className="text-4xl">📭</Text>
          <Text className="text-white text-base font-semibold text-center">Aucune génération pour l'instant</Text>
          <Text className="text-gray-500 text-sm text-center">
            Vos générations apparaîtront ici après votre première utilisation
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <View className="gap-3">
            {items.map((item) => {
              const sc = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.queued;
              return (
                <View
                  key={item.id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-4 gap-2"
                >
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-row items-center gap-2 flex-1">
                      <Text className="text-xl">{SERVICE_ICONS[item.service_type] ?? '⚙️'}</Text>
                      <Text className="text-white text-sm font-medium flex-1" numberOfLines={1}>
                        {item.service_type.replace(/_/g, ' ')}
                      </Text>
                    </View>
                    <View className={`px-2.5 py-0.5 rounded-full ${sc.bg}`}>
                      <Text className={`text-xs font-medium ${sc.text}`}>{sc.label}</Text>
                    </View>
                  </View>

                  <Text className="text-gray-400 text-xs leading-relaxed" numberOfLines={2}>
                    {item.prompt}
                  </Text>

                  <Text className="text-gray-600 text-xs">{formatDate(item.created_at)}</Text>
                </View>
              );
            })}
          </View>

          {page < totalPages && (
            <TouchableOpacity
              onPress={loadMore}
              disabled={loadingMore}
              className="mt-4 border border-gray-700 rounded-xl py-3 items-center"
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color="#6C5CE7" />
              ) : (
                <Text className="text-gray-400 text-sm">Charger plus</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
