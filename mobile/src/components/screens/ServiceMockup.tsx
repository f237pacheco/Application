import { View, Text } from 'react-native';
import type { ServiceId } from '@/lib/services';

interface ServiceMockupProps {
  serviceId: ServiceId;
  accentColor: string;
}

export function ServiceMockup({ serviceId, accentColor }: ServiceMockupProps) {
  if (serviceId === 'website') {
    return (
      <View className="flex-1 rounded-lg overflow-hidden bg-gray-950 border border-gray-800">
        <View className="flex-row items-center gap-1 px-2 py-1.5 bg-gray-900 border-b border-gray-800">
          <View className="w-2 h-2 rounded-full bg-red-500/70" />
          <View className="w-2 h-2 rounded-full bg-yellow-500/70" />
          <View className="w-2 h-2 rounded-full bg-green-500/70" />
          <View className="flex-1 bg-gray-800 rounded h-2.5 ml-2" />
        </View>
        <View className="flex-1 p-2 gap-1.5">
          <View className="h-5 rounded" style={{ backgroundColor: `${accentColor}33` }} />
          <View className="flex-row gap-1.5">
            <View className="w-12 h-8 rounded bg-gray-800" />
            <View className="flex-1 gap-1">
              <View className="h-1.5 rounded bg-gray-700 w-3/4" />
              <View className="h-1.5 rounded bg-gray-800 w-1/2" />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (serviceId === 'voice_agent') {
    return (
      <View className="flex-1 rounded-lg bg-gray-950 border border-gray-800 items-center justify-center gap-2 p-3">
        <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: `${accentColor}22`, borderWidth: 1.5, borderColor: `${accentColor}44` }}>
          <Text className="text-lg">📞</Text>
        </View>
        <View className="flex-row items-end gap-0.5" style={{ height: 24 }}>
          {[3,5,7,4,8,5,3].map((h, i) => (
            <View key={i} className="w-1 rounded-full" style={{ height: h * 3, backgroundColor: accentColor, opacity: 0.7 }} />
          ))}
        </View>
      </View>
    );
  }

  if (serviceId === 'video_editing') {
    return (
      <View className="flex-1 rounded-lg overflow-hidden bg-gray-950 border border-gray-800">
        <View className="flex-1 bg-gray-900 items-center justify-center">
          <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: `${accentColor}33` }}>
            <Text className="text-sm">▶</Text>
          </View>
        </View>
        <View className="h-7 bg-gray-900 border-t border-gray-800 flex-row items-center px-2 gap-1">
          {[2,4,3,5,2].map((w, i) => (
            <View key={i} className="h-3.5 rounded-sm" style={{ width: w * 8, backgroundColor: i % 2 === 0 ? `${accentColor}66` : '#374151' }} />
          ))}
        </View>
      </View>
    );
  }

  if (serviceId === 'appointments') {
    return (
      <View className="flex-1 rounded-lg overflow-hidden bg-gray-950 border border-gray-800">
        <View className="flex-row items-center justify-between px-2 py-1.5 bg-gray-900 border-b border-gray-800">
          <Text className="text-gray-400 text-xs">Avril</Text>
        </View>
        <View className="flex-1 p-1.5 flex-row flex-wrap">
          {Array.from({ length: 20 }, (_, i) => (
            <View
              key={i}
              className="rounded"
              style={{
                width: '14.28%',
                aspectRatio: 1,
                backgroundColor: [3, 8, 15].includes(i) ? `${accentColor}33` : 'transparent',
                borderWidth: i === 8 ? 1 : 0,
                borderColor: accentColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 8, color: [3, 8, 15].includes(i) ? accentColor : '#4b5563' }}>{i + 1}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (serviceId === 'social_media') {
    return (
      <View className="flex-1 rounded-lg bg-gray-950 border border-gray-800 p-2 gap-1.5">
        {[0, 1].map((i) => (
          <View key={i} className="flex-row gap-1.5 bg-gray-900 rounded p-1.5">
            <View className="w-5 h-5 rounded-full" style={{ backgroundColor: `${accentColor}44` }} />
            <View className="flex-1 gap-1">
              <View className="h-1.5 rounded bg-gray-700 w-2/3" />
              <View className="h-1.5 rounded bg-gray-800 w-full" />
            </View>
          </View>
        ))}
        <View className="flex-row gap-1 mt-auto">
          {['IG', 'TW', 'LI'].map((n) => (
            <View key={n} className="flex-1 h-4 rounded items-center justify-center" style={{ backgroundColor: `${accentColor}22` }}>
              <Text style={{ fontSize: 8, fontWeight: 'bold', color: accentColor }}>{n}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (serviceId === 'analytics') {
    return (
      <View className="flex-1 rounded-lg bg-gray-950 border border-gray-800 p-2 gap-1.5">
        <View className="flex-row gap-1">
          {['1.2k', '+14%', '92%'].map((v, i) => (
            <View key={i} className="flex-1 bg-gray-900 rounded p-1 items-center">
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: accentColor }}>{v}</Text>
            </View>
          ))}
        </View>
        <View className="flex-1 flex-row items-end gap-0.5 px-1">
          {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
            <View
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${h}%`, backgroundColor: i === 5 ? accentColor : `${accentColor}44` }}
            />
          ))}
        </View>
      </View>
    );
  }

  return <View className="flex-1 rounded-lg bg-gray-900" />;
}
