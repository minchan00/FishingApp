import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CATEGORY_FILTERS, type CategoryFilter } from '@/components/community/categories';
import { CommentsModal } from '@/components/community/CommentsModal';
import { PostCard } from '@/components/community/PostCard';
import { WritePostModal } from '@/components/community/WritePostModal';
import { errorMessage } from '@/components/log/format';
import { useDeletePost, usePosts, useProfile, useToggleLike } from '@/hooks/queries';
import { useUser } from '@/hooks/useSession';
import { colors } from '@/theme/colors';
import type { Post } from '@/types/models';

const EMPTY_TEXT = 'py-10 text-center text-[14px] text-white/40';

export default function CommunityScreen() {
  const user = useUser();
  const postsQuery = usePosts();
  const profileQuery = useProfile();
  const { mutateAsync: deletePostAsync } = useDeletePost();
  const { mutate: mutateLike } = useToggleLike();

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('전체');
  const [writeModal, setWriteModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

  const nickname = profileQuery.data?.nickname || '낚시꾼';
  const posts = postsQuery.data ?? [];
  const selectedPost = posts.find((p) => p.id === selectedPostId) ?? null;
  const filtered = activeCategory === '전체' ? posts : posts.filter((p) => p.category === activeCategory);

  const confirmDeletePost = useCallback(
    (post: Post) => {
      Alert.alert('게시글 삭제', '정말 삭제할까요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePostAsync(post.id);
              setSelectedPostId((cur) => (cur === post.id ? null : cur));
            } catch (e) {
              Alert.alert('오류', errorMessage(e));
            }
          },
        },
      ]);
    },
    [deletePostAsync],
  );

  const toggleLike = useCallback(
    (post: Post) => mutateLike({ postId: post.id, liked: !post.likedByMe }),
    [mutateLike],
  );

  return (
    <View className="flex-1 bg-ocean-deep">
      <View className="flex-row items-center justify-between px-5 pb-2 pt-14">
        <View>
          <Text className="text-[20px] font-semibold text-white">👥 커뮤니티</Text>
          <Text className="mt-0.5 text-[12px] text-muted">낚시인들의 이야기</Text>
        </View>
        <TouchableOpacity className="rounded-xl bg-accent px-3.5 py-2" onPress={() => setWriteModal(true)}>
          <Text className="text-[13px] font-semibold text-white">✏️ 쓰기</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="h-9 grow-0"
        contentContainerClassName="items-center px-4"
      >
        {CATEGORY_FILTERS.map((c) => {
          const active = activeCategory === c;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => setActiveCategory(c)}
              className={`mr-2 rounded-[10px] border px-3 py-1 ${active ? 'border-accent bg-accent' : 'border-card-border bg-card'}`}
            >
              <Text className={`text-[12px] ${active ? 'font-medium text-white' : 'text-muted'}`}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlashList
        data={filtered}
        keyExtractor={(post) => String(post.id)}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            isMine={item.authorId === user.id}
            onDelete={confirmDeletePost}
            onToggleLike={toggleLike}
            onOpenComments={setSelectedPostId}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={postsQuery.isRefetching}
            onRefresh={() => postsQuery.refetch()}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        // 다시 불러오기에 실패해도 이전 글은 그대로 보여주고 위에 안내만 띄운다
        ListHeaderComponent={
          postsQuery.isError && filtered.length > 0 ? (
            <Text className={EMPTY_TEXT}>게시글을 불러오지 못했어요. 아래로 당겨 다시 시도해주세요.</Text>
          ) : null
        }
        ListEmptyComponent={
          postsQuery.isPending ? (
            <ActivityIndicator color={colors.accent} size="large" className="py-10" />
          ) : postsQuery.isError ? (
            <Text className={EMPTY_TEXT}>게시글을 불러오지 못했어요. 아래로 당겨 다시 시도해주세요.</Text>
          ) : (
            <Text className={EMPTY_TEXT}>아직 게시글이 없어요. 첫 글을 남겨보세요!</Text>
          )
        }
        ListFooterComponent={<View className="h-[30px]" />}
      />

      <WritePostModal visible={writeModal} nickname={nickname} onClose={() => setWriteModal(false)} />

      <CommentsModal
        post={selectedPost}
        visible={selectedPost !== null}
        nickname={nickname}
        userId={user.id}
        onClose={() => setSelectedPostId(null)}
      />
    </View>
  );
}
