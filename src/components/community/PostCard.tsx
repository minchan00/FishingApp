import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme/colors';
import type { Post } from '@/types/models';
import { formatTime } from './formatTime';

type Props = {
  post: Post;
  isMine: boolean;
  onDelete: (post: Post) => void;
  onToggleLike: (post: Post) => void;
  onOpenComments: (postId: number) => void;
};

/** 작성자 자리의 동그란 사람 아이콘 */
export function Avatar({ size = 36 }: { size?: number }) {
  return (
    <View className="items-center justify-center rounded-full bg-surface" style={{ width: size, height: size }}>
      <Icon name="user" size={Math.round(size / 2)} color={colors.mute} />
    </View>
  );
}

/** 커뮤니티 피드 게시글 한 개 */
export const PostCard = memo(function PostCard({ post, isMine, onDelete, onToggleLike, onOpenComments }: Props) {
  return (
    <View className="mx-4 mb-2.5 rounded-card bg-card px-4 py-4">
      <View className="flex-row items-center">
        <Avatar />
        <View className="ml-2.5 flex-1">
          <Text className="text-body font-semibold text-ink" numberOfLines={1}>
            {post.authorNickname}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1.5">
            <Text className="text-caption text-mute">{formatTime(post.createdAt)}</Text>
            <View className="rounded-full bg-surface px-2 py-0.5">
              <Text className="text-caption text-sub">{post.category}</Text>
            </View>
          </View>
        </View>
        {isMine && (
          <Pressable
            onPress={() => onDelete(post)}
            accessibilityLabel="게시글 삭제"
            className="-mr-2 h-9 w-9 items-center justify-center rounded-full active:bg-surface"
          >
            <Icon name="trash-2" size={17} color={colors.mute} />
          </Pressable>
        )}
      </View>

      <Text className="mt-3 text-body text-ink">{post.content}</Text>

      {post.imageUrl && (
        <Image
          source={{ uri: post.imageUrl }}
          style={{ width: '100%', height: 220, borderRadius: 16, marginTop: 12, backgroundColor: colors.surface }}
          contentFit="cover"
          transition={200}
        />
      )}

      <View className="-ml-2 mt-2 flex-row">
        <Pressable
          onPress={() => onToggleLike(post)}
          accessibilityRole="button"
          accessibilityLabel={post.likedByMe ? '좋아요 취소' : '좋아요'}
          accessibilityState={{ selected: post.likedByMe }}
          className="mr-2 h-9 flex-row items-center gap-1.5 rounded-full px-2 active:bg-surface"
        >
          <Icon name="heart" size={18} color={post.likedByMe ? colors.primary : colors.mute} />
          <Text className={`text-label ${post.likedByMe ? 'font-semibold text-primary' : 'text-sub'}`}>{post.likeCount}</Text>
        </Pressable>
        <Pressable
          onPress={() => onOpenComments(post.id)}
          accessibilityRole="button"
          accessibilityLabel="댓글"
          className="h-9 flex-row items-center gap-1.5 rounded-full px-2 active:bg-surface"
        >
          <Icon name="message-circle" size={18} color={colors.mute} />
          <Text className="text-label text-sub">{post.commentCount}</Text>
        </Pressable>
      </View>
    </View>
  );
});
