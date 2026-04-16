'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

interface LimitWarningProps {
  nearLimit: boolean;
  isEnterprise: boolean;
}

export function LimitWarning({ nearLimit, isEnterprise }: LimitWarningProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  if (!nearLimit || isEnterprise || dismissed) return null;

  return (
    <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
      <span className="text-xl shrink-0">⚠️</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-orange-300">{t('dashboard.limitWarning')}</p>
        <Link
          href="/plans?source=upgrade"
          className="text-xs text-orange-400 hover:text-orange-300 underline underline-offset-2 transition-colors"
        >
          {t('dashboard.upgradePlan')} →
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-gray-600 hover:text-gray-400 text-lg leading-none shrink-0 transition-colors"
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  );
}
