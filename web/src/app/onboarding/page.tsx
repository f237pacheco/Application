'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import { clsx } from 'clsx';

const SLIDE_ICONS = ['🚀', '⚡', '🎁'];

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const totalSlides = 3;

  const goTo = useCallback((index: number) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 200);
  }, [animating]);

  const handleNext = () => {
    if (current < totalSlides - 1) {
      goTo(current + 1);
    } else {
      handleStart();
    }
  };

  const handleBack = () => {
    if (current > 0) {
      goTo(current - 1);
    } else {
      router.push('/language');
    }
  };

  const handleStart = () => {
    localStorage.setItem('velona_onboarded', 'true');
    router.push('/auth');
  };

  const slides = [
    {
      icon: SLIDE_ICONS[0],
      title: t('onboarding.slide1.title'),
      subtitle: t('onboarding.slide1.subtitle'),
    },
    {
      icon: SLIDE_ICONS[1],
      title: t('onboarding.slide2.title'),
      subtitle: t('onboarding.slide2.subtitle'),
    },
    {
      icon: SLIDE_ICONS[2],
      title: t('onboarding.slide3.title'),
      subtitle: t('onboarding.slide3.subtitle'),
    },
  ];

  const slide = slides[current];

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <BackButton onClick={handleBack} />
        {current < totalSlides - 1 && (
          <button
            onClick={handleStart}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            {t('onboarding.skip')}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <Logo size="md" className="mb-12 opacity-60" />

        <div
          className={clsx(
            'transition-all duration-200',
            animating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          )}
        >
          {/* Icon */}
          <div className="text-8xl mb-8 select-none">{slide.icon}</div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-4 leading-snug max-w-xs mx-auto">
            {slide.title}
          </h1>

          {/* Subtitle */}
          <p className="text-gray-400 text-base leading-relaxed max-w-sm mx-auto">
            {slide.subtitle}
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div className="px-8 pb-12 flex flex-col items-center gap-6">
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={clsx(
                'h-2 rounded-full transition-all duration-300',
                i === current
                  ? 'w-8 bg-primary-500'
                  : 'w-2 bg-gray-700 hover:bg-gray-600'
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Button */}
        <Button onClick={handleNext} size="lg" fullWidth className="max-w-sm">
          {current === totalSlides - 1
            ? t('onboarding.start')
            : t('onboarding.next')}
        </Button>
      </div>
    </main>
  );
}
