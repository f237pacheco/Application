'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

export default function BusinessInfoPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();

  const plan = searchParams.get('plan') ?? 'enterprise';
  const billing = searchParams.get('billing') ?? 'monthly';
  const service = searchParams.get('service') ?? '';
  const prompt = searchParams.get('prompt') ?? '';

  const [siret, setSiret] = useState('');
  const [vat, setVat] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!siret.trim()) e.siret = t('auth.errors.required');
    if (siret.trim() && !/^\d{14}$/.test(siret.replace(/\s/g, ''))) {
      e.siret = 'Le numéro SIRET doit contenir 14 chiffres';
    }
    if (!address.trim()) e.address = t('auth.errors.required');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      // Save business info to profile
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            siret: siret.replace(/\s/g, ''),
            vatNumber: vat.trim() || undefined,
            billingAddress: address.trim(),
          }),
        }
      );

      if (!res.ok) throw new Error('Failed to save business info');

      // Navigate to payment page with all params
      const params = new URLSearchParams({
        plan,
        billing,
        ...(service ? { service } : {}),
        ...(prompt ? { prompt } : {}),
        siret: siret.replace(/\s/g, ''),
        ...(vat ? { vat } : {}),
        address: address.trim(),
      });
      router.push(`/checkout/payment?${params}`);
    } catch {
      setErrors({ form: t('common.error') });
    } finally {
      setLoading(false);
    }
  };

  const backHref = service ? `/plans?service=${service}` : '/plans';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-900 px-6 py-4">
        <BackButton href={backHref} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          {/* Info banner */}
          <div className="bg-primary-500/10 border border-primary-500/30 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
            <span className="text-xl shrink-0">🏢</span>
            <div>
              <p className="text-sm font-semibold text-primary-300 mb-0.5">
                {t('businessInfo.title')}
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                {t('businessInfo.subtitle')}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-gray-900 rounded-3xl border border-gray-800 p-7 flex flex-col gap-5">
            {errors.form && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
                {errors.form}
              </div>
            )}

            {/* SIRET */}
            <div className="flex flex-col gap-1.5">
              <Input
                id="siret"
                label={`${t('businessInfo.siret')} *`}
                value={siret}
                onChange={(e) => {
                  // Auto-format: add space every 3 digits for readability
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 14);
                  setSiret(raw);
                  setErrors((prev) => ({ ...prev, siret: '' }));
                }}
                placeholder="12345678901234"
                error={errors.siret}
                inputMode="numeric"
                maxLength={14}
              />
              <p className="text-xs text-gray-600">14 chiffres, sans espaces</p>
            </div>

            {/* TVA */}
            <Input
              id="vat"
              label={`${t('businessInfo.vat')} (optionnel)`}
              value={vat}
              onChange={(e) => setVat(e.target.value)}
              placeholder="FR12345678901"
              error={errors.vat}
            />

            {/* Billing address */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="address" className="text-sm font-medium text-gray-200">
                {t('businessInfo.billingAddress')} *
              </label>
              <textarea
                id="address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setErrors((prev) => ({ ...prev, address: '' }));
                }}
                placeholder="12 rue de la Paix&#10;75001 Paris&#10;France"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm transition-all"
              />
              {errors.address && (
                <p className="text-xs text-red-400">{errors.address}</p>
              )}
            </div>

            <Button
              onClick={handleContinue}
              fullWidth
              size="lg"
              loading={loading}
            >
              {t('businessInfo.continue')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
