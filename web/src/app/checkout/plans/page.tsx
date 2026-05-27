'use client';

import { Suspense } from 'react';
import { BackButton } from '@/components/ui/BackButton';
import { PricingSection } from '@/components/ui/pricing-section';

export default function CheckoutPlansPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <div className="sticky top-0 z-40 backdrop-blur border-b px-6 py-4" style={{ background: 'rgba(10,10,15,0.85)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <BackButton href="/dashboard" />
      </div>
      <Suspense>
        <PricingSection />
      </Suspense>
    </div>
  );
}
