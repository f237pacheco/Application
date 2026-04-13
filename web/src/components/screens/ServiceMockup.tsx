import type { ServiceId } from '@/lib/services';

interface ServiceMockupProps {
  serviceId: ServiceId;
  accentColor: string;
}

export function ServiceMockup({ serviceId, accentColor }: ServiceMockupProps) {
  const accent = accentColor;

  if (serviceId === 'website') {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden rounded-lg bg-gray-950 border border-gray-800">
        {/* Browser bar */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-900 border-b border-gray-800 shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500/70" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
          <div className="w-2 h-2 rounded-full bg-green-500/70" />
          <div className="flex-1 bg-gray-800 rounded h-3 ml-2" />
        </div>
        {/* Page content */}
        <div className="flex-1 p-2 flex flex-col gap-1.5">
          <div className="h-6 rounded" style={{ background: `${accent}22` }} />
          <div className="flex gap-1.5">
            <div className="w-14 h-10 rounded bg-gray-800" />
            <div className="flex-1 flex flex-col gap-1">
              <div className="h-2 rounded bg-gray-700 w-3/4" />
              <div className="h-2 rounded bg-gray-800 w-1/2" />
            </div>
          </div>
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="flex-1 h-7 rounded bg-gray-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (serviceId === 'voice_agent') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-lg bg-gray-950 border border-gray-800 p-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${accent}22`, border: `1.5px solid ${accent}44` }}>
          <span className="text-lg">📞</span>
        </div>
        <div className="flex items-end gap-0.5 h-6">
          {[3,5,7,4,8,5,3,6,4].map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-full animate-pulse"
              style={{ height: `${h * 3}px`, background: accent, opacity: 0.6 + i * 0.04 }}
            />
          ))}
        </div>
        <div className="text-xs text-gray-600 font-mono">00:42</div>
      </div>
    );
  }

  if (serviceId === 'video_editing') {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden rounded-lg bg-gray-950 border border-gray-800">
        <div className="flex-1 flex items-center justify-center bg-gray-900">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accent}33` }}>
            <span className="text-sm pl-0.5">▶</span>
          </div>
        </div>
        {/* Timeline */}
        <div className="h-8 bg-gray-900 border-t border-gray-800 flex items-center px-2 gap-1">
          {[2,4,3,5,2,4,3].map((w, i) => (
            <div
              key={i}
              className="h-4 rounded-sm"
              style={{ width: `${w * 8}px`, background: i % 2 === 0 ? `${accent}55` : '#374151' }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (serviceId === 'appointments') {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden rounded-lg bg-gray-950 border border-gray-800">
        {/* Cal header */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-gray-900 border-b border-gray-800">
          <div className="text-xs text-gray-400 font-medium">Avril 2025</div>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded bg-gray-800" />
            <div className="w-4 h-4 rounded bg-gray-800" />
          </div>
        </div>
        {/* Days grid */}
        <div className="flex-1 p-1.5 grid grid-cols-7 gap-0.5">
          {Array.from({ length: 28 }, (_, i) => (
            <div
              key={i}
              className="aspect-square rounded text-center flex items-center justify-center text-xs"
              style={{
                background: [3, 8, 15, 22].includes(i) ? `${accent}33` : 'transparent',
                color: [3, 8, 15, 22].includes(i) ? accent : '#6b7280',
                border: i === 8 ? `1px solid ${accent}` : 'none',
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (serviceId === 'social_media') {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden rounded-lg bg-gray-950 border border-gray-800 p-2 gap-1.5">
        {[0,1].map((i) => (
          <div key={i} className="flex gap-1.5 items-start bg-gray-900 rounded p-1.5">
            <div className="w-5 h-5 rounded-full shrink-0" style={{ background: `${accent}44` }} />
            <div className="flex-1 flex flex-col gap-1">
              <div className="h-1.5 rounded bg-gray-700 w-2/3" />
              <div className="h-1.5 rounded bg-gray-800 w-full" />
              <div className="flex gap-2 mt-0.5">
                <div className="h-1 w-4 rounded bg-gray-800" />
                <div className="h-1 w-4 rounded bg-gray-800" />
              </div>
            </div>
          </div>
        ))}
        <div className="flex gap-1 mt-auto">
          {['IG','TW','LI'].map((n) => (
            <div key={n} className="flex-1 h-4 rounded text-center flex items-center justify-center" style={{ background: `${accent}22` }}>
              <span className="text-[8px] font-bold" style={{ color: accent }}>{n}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (serviceId === 'analytics') {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden rounded-lg bg-gray-950 border border-gray-800 p-2 gap-1.5">
        {/* KPIs */}
        <div className="flex gap-1">
          {['1.2k', '+14%', '92%'].map((v, i) => (
            <div key={i} className="flex-1 bg-gray-900 rounded p-1 text-center">
              <div className="text-xs font-bold" style={{ color: accent }}>{v}</div>
              <div className="h-1 rounded bg-gray-800 mt-0.5 w-full" />
            </div>
          ))}
        </div>
        {/* Bar chart */}
        <div className="flex-1 flex items-end gap-1 px-1">
          {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${h}%`, background: i === 5 ? accent : `${accent}44` }}
            />
          ))}
        </div>
        <div className="flex justify-between px-1">
          {['L','M','M','J','V','S','D'].map((d, i) => (
            <span key={i} className="text-[8px] text-gray-600">{d}</span>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
