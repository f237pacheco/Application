import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  type TouchableOpacityProps,
} from 'react-native';
import { clsx } from 'clsx';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  label: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  label,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const containerClass = clsx(
    'flex-row items-center justify-center rounded-xl',
    {
      'bg-primary-500': variant === 'primary',
      'bg-gray-800': variant === 'secondary',
      'border border-gray-600': variant === 'outline',
      'py-2 px-4': size === 'sm',
      'py-3.5 px-6': size === 'md',
      'py-4 px-8': size === 'lg',
      'w-full': fullWidth,
      'opacity-50': disabled || loading,
    }
  );

  const textClass = clsx('font-semibold', {
    'text-white': variant === 'primary',
    'text-white': variant === 'secondary',
    'text-gray-300': variant === 'ghost' || variant === 'outline',
    'text-sm': size === 'sm',
    'text-base': size === 'md',
    'text-lg': size === 'lg',
  });

  return (
    <TouchableOpacity
      {...props}
      disabled={disabled || loading}
      activeOpacity={0.8}
      className={containerClass}
      style={style}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#ffffff' : '#6C5CE7'}
        />
      ) : (
        <Text className={textClass}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
