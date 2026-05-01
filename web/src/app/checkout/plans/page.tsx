'use client';

import { Suspense } from 'react';
import { BackButton } from '@/components/ui/BackButton';
import { PricingSection } from '@/components/ui/pricing-section';

export default function CheckoutPlansPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur border-b border-gray-900 px-6 py-4">
        <BackButton href="/dashboard" />
      </div>
      <Suspense>
        <PricingSection />
      </Suspense>
    </div>
  );
}
