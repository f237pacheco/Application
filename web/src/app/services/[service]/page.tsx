'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { ServiceMockup } from '@/components/screens/ServiceMockup';
import { getService, type ServiceId } from '@/lib/services';

export default function ServiceDetailPage() {
  const { service: serviceParam } = useParams<{ service: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const serviceId = serviceParam as ServiceId;
  const service = getService(serviceId);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');

  if (!service) {
    router.replace('/dashboard');
    return null;
  }

  const handleContinue = () => {
    if (prompt.trim().length < 10) {
      setError(t('auth.errors.required'));
      return;
    }
    const encoded = encodeURIComponent(prompt.trim());
    router.push(`/plans?service=${serviceId}&prompt=${encoded}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-900 px-6 py-4">
        <BackButton href="/dashboard" />
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8 flex flex-col gap-8">
        {/* Service hero */}
        <div className={`rounded-2xl bg-gradient-to-br ${service.bgGradient} border border-gray-800 overflow-hidden`}>
          <div className="h-44 p-4">
            <ServiceMockup serviceId={service.id} accentColor={service.accentColor} />
          </div>
          <div className="px-6 pb-6 pt-2 flex items-start gap-4">
            <span className="text-4xl shrink-0">{service.icon}</span>
            <div>
              <h1 className="text-xl font-bold text-white">
                {t(`${service.i18nKey}.name`)}
              </h1>
              <p className="text-gray-300 text-sm mt-1 leading-relaxed">
                {t(`${service.i18nKey}.description`)}
              </p>
            </div>
          </div>
        </div>

        {/* Prompt section */}
        <div className="flex flex-col gap-3">
          <label className="text-base font-semibold text-white">
            {t('services.describe')}
          </label>

          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setError(''); }}
              placeholder={t(`${service.i18nKey}.placeholder`)}
              rows={5}
              maxLength={2000}
              className="w-full px-4 py-3.5 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-600
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                resize-none text-sm leading-relaxed transition-all duration-200"
            />
            <span className="absolute bottom-3 right-3 text-xs text-gray-600">
              {prompt.length}/2000
            </span>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div
            className="flex items-start gap-2 px-4 py-3 rounded-xl border"
            style={{ background: `${service.color}11`, borderColor: `${service.color}33` }}
          >
            <span className="text-base shrink-0">💡</span>
            <p className="text-xs leading-relaxed" style={{ color: service.accentColor }}>
              {t('services.helpText')}
            </p>
          </div>
        </div>

        {/* CTA */}
        <Button
          onClick={handleContinue}
          fullWidth
          size="lg"
          disabled={prompt.trim().length < 10}
        >
          {t('services.continue')}
        </Button>
      </div>
    </div>
  );
}
