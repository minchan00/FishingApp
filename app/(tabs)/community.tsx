import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CATEGORY_FILTERS, type CategoryFilter } from '@/components/community/categories';
import { CommentsModal } from '@/components/community/CommentsModal';
import { formatTime } from '@/components/community/formatTime';
import { WritePostModal } from '@/components/community/WritePostModal';
import { errorMessage } from '@/components/log/format';
import { useDeletePost, usePosts, useProfile, useToggleLike } from '@/hooks/queries';
import { useUser } from '@/hooks/useSession';
import { colors } from '@/theme/colors';
import type { Post } from '@/types/models';

export default function CommunityScreen() {
  const user = useUser();
  const postsQuery = usePosts();
  const profileQuery = useProfile();
  const deletePost = useDeletePost();
  const toggleLike = useToggleLike();

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('전체');
  const [writeModal, setWriteModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

  const nickname = profileQuery.data?.nickname || '낚시꾼';
  const posts = postsQuery.data ?? [];
  const selectedPost = posts.find((p) => p.id === selectedPostId) ?? null;
  const filtered = activeCategory === '전체' ? posts : posts.filter((p) => p.category === activeCategory);

  const confirmDeletePost = (post: Post) => {
    Alert.alert('게시글 삭제', '정말 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost.mutateAsync(post.id);
            if (selectedPostId === post.id) setSelectedPostId(null);
          } catch (e) {
            Alert.alert('오류', errorMessage(e));
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>👥 커뮤니티</Text>
          <Text style={styles.sub}>낚시인들의 이야기</Text>
        </View>
        <TouchableOpacity style={styles.writeBtn} onPress={() => setWriteModal(true)}>
          <Text style={styles.writeBtnText}>✏️ 쓰기</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ height: 36, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
      >
        {CATEGORY_FILTERS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setActiveCategory(c)}
            style={[styles.chip, activeCategory === c && styles.chipActive, { marginRight: 8 }]}
          >
            <Text style={[styles.chipText, activeCategory === c && { color: colors.white, fontWeight: '500' }]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={postsQuery.isRefetching}
            onRefresh={() => postsQuery.refetch()}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          {postsQuery.isPending ? (
            <ActivityIndicator color={colors.accent} size="large" style={{ paddingVertical: 40 }} />
          ) : postsQuery.isError ? (
            <Text style={styles.emptyText}>게시글을 불러오지 못했어요. 아래로 당겨 다시 시도해주세요.</Text>
          ) : (
            filtered.length === 0 && <Text style={styles.emptyText}>아직 게시글이 없어요. 첫 글을 남겨보세요!</Text>
          )}
          {filtered.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={styles.userAvatar}>
                  <Text style={{ fontSize: 18 }}>{post.authorEmoji}</Text>
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={{ color: colors.white, fontSize: 13, fontWeight: '500' }}>{post.authorNickname}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 1 }}>
                    {formatTime(post.createdAt)} · {post.category}
                  </Text>
                </View>
                {post.authorId === user.id && (
                  <TouchableOpacity onPress={() => confirmDeletePost(post)}>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>🗑️</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={{ color: colors.white, fontSize: 13, lineHeight: 20, marginBottom: 10 }}>{post.content}</Text>

              {post.imageUrl && <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />}

              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                <TouchableOpacity
                  style={{ marginRight: 16 }}
                  onPress={() => toggleLike.mutate({ postId: post.id, liked: !post.likedByMe })}
                >
                  <Text style={{ color: post.likedByMe ? colors.accent : colors.textMuted, fontSize: 13 }}>
                    {post.likedByMe ? '❤️' : '🤍'} {post.likeCount}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedPostId(post.id)}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>💬 {post.commentCount}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.oceanDeep },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title: { color: colors.white, fontSize: 20, fontWeight: '600' },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  writeBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  writeBtnText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  chip: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontSize: 12 },
  emptyText: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingVertical: 40, fontSize: 14 },
  postCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, padding: 14, marginBottom: 10 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.oceanSurface, alignItems: 'center', justifyContent: 'center' },
  postImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 10 },
});
