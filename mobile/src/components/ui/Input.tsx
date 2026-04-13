import { View, Text, TextInput, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="gap-1.5">
      {label && (
        <Text className="text-sm font-medium text-gray-200">{label}</Text>
      )}
      <TextInput
        {...props}
        placeholderTextColor="#6b7280"
        className={[
          'w-full px-4 py-3.5 rounded-xl bg-gray-800 border text-white text-base',
          error ? 'border-red-500' : 'border-gray-700',
        ].join(' ')}
      />
      {error && <Text className="text-xs text-red-400">{error}</Text>}
    </View>
  );
}
