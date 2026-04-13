'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export default function CheckoutCancelPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') ?? '';
  const service = searchParams.get('service') ?? '';

  const retryHref = plan
    ? `/checkout/payment?plan=${plan}${service ? `&service=${service}` : ''}`
    : '/plans';

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-7 text-center">
        <Logo size="md" />

        <div className="text-6xl">😕</div>

        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Paiement annulé</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Votre paiement a été annulé. Aucun montant n'a été débité.
            Vous pouvez réessayer à tout moment.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button onClick={() => router.push(retryHref)} fullWidth size="lg">
            Réessayer le paiement
          </Button>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="ghost"
            fullWidth
          >
            Revenir au dashboard
          </Button>
        </div>
      </div>
    </main>
  );
}
