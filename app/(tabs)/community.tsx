import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CATEGORY_FILTERS, type CategoryFilter } from '@/components/community/categories';
import { CommentsModal } from '@/components/community/CommentsModal';
import { PostCard } from '@/components/community/PostCard';
import { WritePostModal } from '@/components/community/WritePostModal';
import { errorMessage } from '@/components/log/format';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { IconButton, ScreenHeader } from '@/components/ui/ScreenHeader';
import { SeaScreen } from '@/components/ui/Sea';
import { useDeletePost, usePosts, useProfile, useToggleLike } from '@/hooks/queries';
import { useUser } from '@/hooks/useSession';
import { colors } from '@/theme/colors';
import type { Post } from '@/types/models';

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
    <SeaScreen>
      <ScreenHeader
        title="커뮤니티"
        eyebrow="낚시인들의 이야기"
        right={<IconButton icon="edit-3" label="글쓰기" onPress={() => setWriteModal(true)} />}
      />

      <View className="pb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0" contentContainerClassName="gap-2 px-4">
          {CATEGORY_FILTERS.map((c) => (
            <Chip key={c} label={c} selected={activeCategory === c} onPress={() => setActiveCategory(c)} />
          ))}
        </ScrollView>
      </View>

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
        refreshControl={
          <RefreshControl
            refreshing={postsQuery.isRefetching}
            onRefresh={() => postsQuery.refetch()}
            tintColor={colors.white}
            colors={[colors.primary]}
          />
        }
        // 다시 불러오기에 실패해도 이전 글은 그대로 보여주고 위에 안내만 띄운다
        ListHeaderComponent={
          postsQuery.isError && filtered.length > 0 ? (
            <View className="mx-5 mt-3 flex-row items-center gap-2 rounded-field bg-danger-soft px-3.5 py-3">
              <Icon name="alert-circle" size={16} color={colors.danger} />
              <Text className="flex-1 text-label text-danger">게시글을 불러오지 못했어요. 아래로 당겨 다시 시도해주세요.</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          postsQuery.isPending ? (
            <ActivityIndicator color={colors.white} size="large" className="py-10" />
          ) : postsQuery.isError ? (
            <EmptyState
              icon="alert-circle"
              title="게시글을 불러오지 못했어요."
              description="아래로 당겨 다시 시도해주세요."
              actionLabel="다시 시도"
              onAction={() => postsQuery.refetch()}
            />
          ) : (
            <EmptyState icon="message-square" title="아직 게시글이 없어요." description="첫 글을 남겨보세요!" />
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
    </SeaScreen>
  );
}
