'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

interface BackButtonProps {
  href?: string;
  label?: string;
  className?: string;
  onClick?: () => void;
}

export function BackButton({ href, label, className, onClick }: BackButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const handleBack = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`flex items-center gap-1 text-gray-400 hover:text-white transition-colors duration-200 group ${className ?? ''}`}
      aria-label={label ?? t('common.back')}
    >
      <span className="text-lg group-hover:-translate-x-0.5 transition-transform duration-200 inline-block">
        ‹
      </span>
      <span className="text-sm font-medium">{label ?? t('common.back')}</span>
    </button>
  );
}
