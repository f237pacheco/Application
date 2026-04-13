import { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDE_ICONS = ['🚀', '⚡', '🎁'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const [current, setCurrent] = useState(0);

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

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setCurrent(index);
  };

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrent(index);
  };

  const handleNext = async () => {
    if (current < slides.length - 1) {
      goToSlide(current + 1);
    } else {
      await handleStart();
    }
  };

  const handleStart = async () => {
    await AsyncStorage.setItem('velona_onboarded', 'true');
    router.replace('/(auth)/login');
  };

  const handleBack = () => {
    if (current > 0) {
      goToSlide(current - 1);
    } else {
      router.replace('/language');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <BackButton onPress={handleBack} />
        {current < slides.length - 1 && (
          <TouchableOpacity onPress={handleStart} activeOpacity={0.7}>
            <Text className="text-gray-500 text-sm font-medium">
              {t('onboarding.skip')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Logo */}
      <View className="items-center pt-4 pb-2">
        <Logo size="sm" />
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        className="flex-1"
      >
        {slides.map((slide, index) => (
          <View
            key={index}
            style={{ width: SCREEN_WIDTH }}
            className="flex-1 items-center justify-center px-10 pb-8"
          >
            <Text className="text-8xl mb-10 text-center">{slide.icon}</Text>
            <Text className="text-2xl font-bold text-white text-center mb-4 leading-snug">
              {slide.title}
            </Text>
            <Text className="text-gray-400 text-base text-center leading-relaxed">
              {slide.subtitle}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom */}
      <View className="px-8 pb-10 gap-6 items-center">
        {/* Dots */}
        <View className="flex-row gap-2">
          {slides.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goToSlide(i)} activeOpacity={0.7}>
              <View
                className={[
                  'h-2 rounded-full transition-all',
                  i === current ? 'w-8 bg-primary-500' : 'w-2 bg-gray-700',
                ].join(' ')}
                style={{ width: i === current ? 32 : 8 }}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Button */}
        <Button
          onPress={handleNext}
          label={current === slides.length - 1 ? t('onboarding.start') : t('onboarding.next')}
          size="lg"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}
