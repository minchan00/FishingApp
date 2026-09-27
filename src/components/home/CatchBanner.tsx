import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { usePosts } from '@/hooks/queries';
import { colors } from '@/theme/colors';
import type { Post } from '@/types/models';
import { Icon } from '../ui/Icon';

const BANNER_HEIGHT = 176;
const MAX_SLIDES = 5;

/** 홈 남색 헤더 안의 "오늘의 인증샷" 사진 배너. 커뮤니티의 사진 있는 글을 넘겨 본다 */
export default function CatchBanner() {
  const posts = usePosts();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const slides = (posts.data ?? [])
    .filter((p): p is Post & { imageUrl: string } => !!p.imageUrl)
    .sort((a, b) => Number(b.category === '인증샷') - Number(a.category === '인증샷'))
    .slice(0, MAX_SLIDES);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  if (slides.length === 0) {
    return (
      <Pressable
        onPress={() => router.push('/community')}
        className="flex-row items-center gap-3 rounded-card bg-surface p-4 active:bg-surface-strong"
      >
        <Icon name="camera" size={20} color={colors.primary} />
        <View className="flex-1">
          <Text className="text-body font-semibold text-ink">오늘 잡은 물고기를 자랑해 보세요</Text>
          <Text className="mt-0.5 text-caption text-mute">인증샷을 올리면 여기에 보여요</Text>
        </View>
        <Icon name="chevron-right" size={18} color={colors.mute} />
      </Pressable>
    );
  }

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        className="overflow-hidden rounded-card"
      >
        {slides.map((post) => (
          <Pressable key={post.id} onPress={() => router.push('/community')} style={{ width, height: BANNER_HEIGHT }}>
            <Image source={{ uri: post.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
            <View className="absolute bottom-0 left-0 right-0 px-4 pb-3.5 pt-8" style={{ backgroundColor: 'rgba(11,37,69,0.55)' }}>
              <Text className="text-caption font-semibold text-white/80">{post.category} · {post.authorNickname}</Text>
              <Text className="mt-0.5 text-body font-semibold text-white" numberOfLines={1}>
                {post.content.split('\n')[0]}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {slides.length > 1 ? (
        <View className="absolute right-3 top-3 rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(11,37,69,0.6)' }}>
          <Text className="text-caption font-semibold text-white">
            {index + 1} / {slides.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
