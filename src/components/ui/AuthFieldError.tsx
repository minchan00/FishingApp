import { Text } from 'react-native';

type Props = { message?: string };

/**
 * 입력칸 바로 아래 붙는 검증 오류 문구.
 * 입력칸의 아래 여백(12px) 안으로 끌어올려서, 오류가 없을 때의 간격은 그대로 둔다.
 */
export default function AuthFieldError({ message }: Props) {
  if (!message) return null;
  return (
    <Text className="-mt-2 mb-3 w-full self-stretch px-1 text-[12px] text-accent-2" accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}
