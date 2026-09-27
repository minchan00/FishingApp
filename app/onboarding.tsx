import { Image, type ImageContentPosition } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { SEA_TEXT_SHADOW } from '@/components/ui/Sea';
import { useOnboarding } from '@/hooks/useOnboarding';
import { colors } from '@/theme/colors';

const BREAKWATER = require('../assets/images/anglers-breakwater.jpg');
const WALKING = require('../assets/images/anglers-walking.jpg');
const FADE = require('../assets/images/fade-sand.png');

// 소개 화면의 예시 카드는 기능을 보여주기 위한 그림이다 (실제 데이터 아님)
function TideSample() {
  return (
    <View className="rounded-[24px] bg-card p-[18px]" style={CARD_SHADOW}>
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-caption text-sub">다음 만조 · 7물</Text>
          <Text className="font-serif text-[30px] leading-[38px] text-ink">15:10</Text>
        </View>
        <View className="rounded-full bg-accent-soft px-3 py-1"><Text className="text-label font-bold text-accent-ink">1시간 5분 후</Text></View>
      </View>
      <View className="mt-3 h-[70px] flex-row items-end justify-between px-1">
        {[30, 48, 62, 66, 56, 38, 24, 20, 30, 46, 60, 64].map((h, i) => (
          <View key={i} className={`w-[14px] rounded-full ${i === 9 ? 'bg-accent' : 'bg-primary-soft'}`} style={{ height: h }} />
        ))}
      </View>
      <View className="mt-3 flex-row gap-1.5">
        {['낚시 지수 85', '13:40 철수', '파고 0.4m'].map((t, i) => (
          <View key={t} className={`rounded-full px-2.5 py-1 ${i === 1 ? 'bg-accent-soft' : 'bg-surface'}`}>
            <Text className={`text-caption font-bold ${i === 1 ? 'text-accent-ink' : 'text-primary'}`}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function DogamSample() {
  const fish = [['광어', true], ['우럭', true], ['참돔', true], ['감성돔', false], ['농어', false], ['망둑어', false]] as const;
  return (
    <View className="rounded-[24px] bg-card p-4" style={CARD_SHADOW}>
      <View className="flex-row items-baseline justify-between">
        <Text className="font-serif text-[16px] text-ink">내 도감</Text>
        <Text className="text-label font-bold text-accent-ink">3 / 40종</Text>
      </View>
      <View className="mt-3 flex-row flex-wrap justify-between gap-y-2">
        {fish.map(([name, got]) => (
          <View key={name} className="w-[31.5%] items-center rounded-field bg-surface py-3">
            <Icon name="fish" size={26} color={got ? colors.primary : colors.mute} />
            <Text className={`mt-1 text-caption font-bold ${got ? 'text-ink' : 'text-mute'}`}>{name}</Text>
          </View>
        ))}
      </View>
      <View className="mt-3 flex-row items-center gap-2 rounded-field bg-surface px-3 py-2.5">
        <Icon name="camera" size={16} color={colors.primary} />
        <Text className="flex-1 text-label font-bold text-ink">사진으로 어종 알아보기</Text>
        <Text className="text-caption font-bold text-primary">AI</Text>
      </View>
    </View>
  );
}

const CARD_SHADOW = { shadowColor: '#503C28', shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6 };

type Page = {
  image: number;
  position: ImageContentPosition;
  /** 그림 영역 높이 (화면 높이 비율) */
  imageRatio: number;
  sample?: ReactNode;
  title: string;
  body: string;
};

const PAGES: Page[] = [
  {
    image: BREAKWATER, position: { top: '62%' }, imageRatio: 0.62,
    title: '방파제·갯바위,\n걸어서 가는 낚시',
    body: '가까운 포인트와 물때를 한눈에 보고,\n잡은 물고기는 사진 한 장으로 남겨요.',
  },
  {
    image: BREAKWATER, position: { top: '38%' }, imageRatio: 0.4, sample: <TideSample />,
    title: '언제 나가고 언제 빠질지\n물때로 알려줘요',
    body: '만조·간조와 바람으로 낚시 지수를 계산하고,\n갯바위 철수 시간도 미리 알려줘요.',
  },
  {
    image: WALKING, position: { top: '56%', right: '0%' }, imageRatio: 0.36, sample: <DogamSample />,
    title: '잡을수록 채워지는\n나만의 도감',
    body: '조과를 기록하면 도감이 자동으로 채워져요.\n모르는 물고기는 사진으로 물어보세요.',
  },
];

export default function OnboardingScreen() {
  const { height } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const { markSeen } = useOnboarding();
  const [index, setIndex] = useState(0);
  const last = index === PAGES.length - 1;
  const p = PAGES[index]!;
  const imageHeight = Math.round(height * p.imageRatio);

  // 스크롤로 넘기면 웹·기기마다 페이지와 버튼 번호가 어긋날 수 있어 현재 장만 그린다
  const next = () => (last ? markSeen() : setIndex(index + 1));

  return (
    <View className="flex-1 bg-bg">
      <StatusBar style="light" />
      <View key={index} className="flex-1">
        <View style={{ height: imageHeight }}>
          <Image source={p.image} style={{ width: '100%', height: '100%' }} contentFit="cover" contentPosition={p.position} transition={250} />
          <Image source={FADE} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 }} contentFit="fill" />
        </View>
        {p.sample ? <View className="-mt-[110px] px-6">{p.sample}</View> : null}
        <View className="mt-auto px-6" style={{ paddingBottom: 150 + bottom }}>
          <Text className="font-serif text-[28px] leading-[40px] text-ink">{p.title}</Text>
          <Text className="mt-3 text-body leading-[24px] text-sub">{p.body}</Text>
        </View>
      </View>

      {/* 첫 장 왼쪽 위 이름 */}
      {index === 0 ? (
        <Text className="absolute left-6 font-serif text-[20px] text-[#FFF8EC]" style={[{ top: top + 16 }, SEA_TEXT_SHADOW]}>짬낚고</Text>
      ) : (
        <Pressable onPress={() => setIndex(index - 1)} hitSlop={10} className="absolute left-4 h-10 w-10 items-center justify-center rounded-full bg-black/20" style={{ top: top + 8 }} accessibilityRole="button" accessibilityLabel="이전">
          <Icon name="chevron-left" size={22} color={colors.white} />
        </Pressable>
      )}
      <Pressable onPress={markSeen} hitSlop={10} className="absolute right-5 px-2 py-1.5" style={{ top: top + 12 }} accessibilityRole="button">
        <Text className="text-label text-[#FFF8EC]" style={SEA_TEXT_SHADOW}>건너뛰기</Text>
      </Pressable>

      <View className="absolute left-6 right-6" style={{ bottom: 32 + bottom }}>
        <View className="mb-5 flex-row gap-1.5">
          {PAGES.map((pg, i) => (
            <View key={pg.title} className={`h-1.5 rounded-full ${i === index ? 'w-[22px] bg-navy' : 'w-1.5 bg-surface-strong'}`} />
          ))}
        </View>
        <Button label={last ? '시작하기' : '다음'} onPress={next} />
      </View>
    </View>
  );
}
