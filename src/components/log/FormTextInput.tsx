import { Text, TextInput, type TextInputProps } from 'react-native';
import { useController, type Control, type FieldPathByValue, type FieldValues } from 'react-hook-form';

export const PLACEHOLDER_COLOR = 'rgba(255,255,255,0.4)';

/** 필드 아래에 붙는 검증 오류 문구. spacing으로 기본 여백을 바꿀 수 있다 */
export function FieldError({ message, spacing = '-mt-1 mb-2.5' }: { message: string | undefined; spacing?: string }) {
  if (!message) return null;
  return <Text className={`ml-1 text-[12px] text-accent-2 ${spacing}`}>{message}</Text>;
}

type Props<T extends FieldValues, C, O extends FieldValues> = Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur'> & {
  control: Control<T, C, O>;
  name: FieldPathByValue<T, string>;
  /** false면 오류 문구를 직접 그린다(가로 배치 등) */
  showError?: boolean;
};

/** react-hook-form에 묶인 TextInput. 값은 문자열 필드만 받는다 */
export function FormTextInput<T extends FieldValues, C = unknown, O extends FieldValues = T>({
  control,
  name,
  showError = true,
  ...rest
}: Props<T, C, O>) {
  const { field, fieldState } = useController({ control, name });
  return (
    <>
      <TextInput
        placeholderTextColor={PLACEHOLDER_COLOR}
        {...rest}
        ref={field.ref}
        value={typeof field.value === 'string' ? field.value : ''}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
      />
      {showError && <FieldError message={fieldState.error?.message} />}
    </>
  );
}
