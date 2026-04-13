'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export default function CheckoutSuccessPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();

  const planId = searchParams.get('plan') ?? '';
  const provider = searchParams.get('provider') ?? 'stripe';
  const subscriptionId = searchParams.get('subscription_id') ?? '';

  const [activating, setActivating] = useState(provider === 'paypal' && !!subscriptionId);

  // For PayPal: activate subscription on return
  useEffect(() => {
    if (provider !== 'paypal' || !subscriptionId || !session?.access_token) return;

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/payments/paypal-success?subscription_id=${subscriptionId}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    )
      .catch(() => null)
      .finally(() => setActivating(false));
  }, [provider, subscriptionId, session]);

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md flex flex-col items-center gap-8 text-center">
        <Logo size="md" />

        {/* Success animation */}
        <div className="relative">
          <div className="w-28 h-28 rounded-full bg-success-DEFAULT/20 border-2 border-success-DEFAULT/40 flex items-center justify-center">
            {activating ? (
              <div className="w-10 h-10 border-4 border-success-DEFAULT border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-5xl">✅</span>
            )}
          </div>
          {/* Pulse ring */}
          {!activating && (
            <div className="absolute inset-0 rounded-full border-2 border-success-DEFAULT/30 animate-ping" />
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white mb-3">
            {activating ? 'Activation en cours…' : 'Bienvenue dans Velona !'}
          </h1>
          <p className="text-gray-400 leading-relaxed">
            {activating
              ? 'Nous activons votre abonnement PayPal, cela prendra quelques secondes.'
              : `Votre essai gratuit de 3 jours commence maintenant. Vous ne serez débité qu'après la fin de la période d'essai.`}
          </p>
        </div>

        {!activating && (
          <>
            {/* Plan badge */}
            {planId && (
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-500/20 border border-primary-500/30 rounded-full">
                <span className="text-sm">✨</span>
                <span className="text-sm font-semibold text-primary-300">
                  Plan {planId.charAt(0).toUpperCase() + planId.slice(1)} activé
                </span>
              </div>
            )}

            {/* Free trial reminder */}
            <div className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 flex items-start gap-3 text-left">
              <span className="text-xl shrink-0">📅</span>
              <div>
                <p className="text-sm font-semibold text-white mb-0.5">Rappel essai gratuit</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Votre carte ne sera <strong className="text-white">pas débitée</strong> pendant
                  3 jours. Annulez à tout moment depuis votre compte sans frais.
                </p>
              </div>
            </div>

            <Button onClick={() => router.replace('/dashboard')} size="lg" fullWidth>
              Accéder à mon dashboard →
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
