import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '@/theme/colors';

type Props = TextInputProps & {
  label?: string;
  /** 검증 오류 메시지. 있으면 테두리가 빨갛게 바뀐다 */
  error?: string;
  hint?: string;
  className?: string;
};

/** 라벨 + 입력칸 + 오류/도움말. react-hook-form의 Controller에서 value/onChangeText/onBlur를 넘겨 쓴다 */
export const TextField = forwardRef<TextInput, Props>(function TextField({ label, error, hint, className = '', multiline, style, ...rest }, ref) {
  return (
    <View className={`gap-1.5 ${className}`}>
      {label ? <Text className="text-label font-medium text-sub">{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.mute}
        multiline={multiline}
        className={`rounded-field border bg-bg px-3.5 text-body text-ink ${multiline ? 'min-h-[96px] py-3' : 'h-[48px]'} ${error ? 'border-danger' : 'border-line focus:border-primary'}`}
        style={[multiline ? { textAlignVertical: 'top' } : null, style]}
        {...rest}
      />
      {error ? <Text className="text-caption text-danger">{error}</Text> : hint ? <Text className="text-caption text-mute">{hint}</Text> : null}
    </View>
  );
});
