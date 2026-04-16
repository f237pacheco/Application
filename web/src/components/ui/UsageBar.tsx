import { clsx } from 'clsx';

interface UsageBarProps {
  used: number;
  limit: number | null;
  label?: string;
  icon?: string;
  className?: string;
}

function getColor(pct: number) {
  if (pct >= 90) return { bar: 'bg-red-500', text: 'text-red-400' };
  if (pct >= 70) return { bar: 'bg-orange-400', text: 'text-orange-400' };
  return { bar: 'bg-success-DEFAULT', text: 'text-success-DEFAULT' };
}

export function UsageBar({ used, limit, label, icon, className }: UsageBarProps) {
  const isUnlimited = limit === null;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit!) * 100));
  const { bar, text } = getColor(pct);

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300 flex items-center gap-1.5">
          {icon && <span>{icon}</span>}
          {label}
        </span>
        <span className={clsx('text-xs font-semibold tabular-nums', isUnlimited ? 'text-gray-400' : text)}>
          {isUnlimited ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>

      {/* Bar */}
      {!isUnlimited && (
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all duration-500', bar)}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
