'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/hooks/useAuth';
import { clsx } from 'clsx';

const SECTORS = [
  'Restauration', 'Commerce', 'Services', 'Santé', 'Immobilier',
  'Tech', 'Marketing', 'Juridique', 'Finance', 'Éducation', 'Autre',
];

type AccountType = 'individual' | 'professional';

export default function ProfileSetupPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { session } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = t('auth.errors.required');
    if (accountType === 'professional' && !companyName.trim()) {
      e.companyName = t('auth.errors.required');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            firstName: firstName.trim(),
            accountType,
            companyName: companyName.trim() || undefined,
            sector: sector || undefined,
          }),
        }
      );

      if (!res.ok) throw new Error('Profile save failed');
      router.push('/services');
    } catch {
      setErrors({ form: t('common.error') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-8">
        <BackButton href="/auth" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10">
        <Logo size="md" className="mb-8" />

        <div className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="bg-gray-900 rounded-3xl border border-gray-800 p-8 flex flex-col gap-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-1">
                {t('auth.title')}
              </h1>
            </div>

            {/* Error */}
            {errors.form && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
                {errors.form}
              </div>
            )}

            {/* First name */}
            <Input
              id="firstName"
              label={t('auth.firstName')}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jean"
              error={errors.firstName}
              autoFocus
            />

            {/* Account type */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-200">
                {t('auth.accountType')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['individual', 'professional'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAccountType(type)}
                    className={clsx(
                      'py-3 px-4 rounded-xl border text-sm font-medium transition-all duration-200',
                      accountType === type
                        ? 'bg-primary-500/20 border-primary-500 text-primary-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    )}
                  >
                    {t(`auth.${type}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Professional fields */}
            {accountType === 'professional' && (
              <>
                <Input
                  id="companyName"
                  label={t('auth.companyName')}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Mon Entreprise SAS"
                  error={errors.companyName}
                />

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-200">
                    {t('auth.sector')}
                  </label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  >
                    <option value="">—</option>
                    {SECTORS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Submit */}
            <Button type="submit" fullWidth size="lg" loading={loading}>
              {t('auth.continue')}
            </Button>

            <p className="text-xs text-gray-600 text-center">
              {t('auth.terms')}
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
