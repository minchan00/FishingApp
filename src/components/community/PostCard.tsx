import { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import type { Post } from '@/types/models';
import { formatTime } from './formatTime';

type Props = {
  post: Post;
  isMine: boolean;
  onDelete: (post: Post) => void;
  onToggleLike: (post: Post) => void;
  onOpenComments: (postId: number) => void;
};

/** 커뮤니티 피드 게시글 카드 */
export const PostCard = memo(function PostCard({ post, isMine, onDelete, onToggleLike, onOpenComments }: Props) {
  return (
    <View className="mb-2.5 rounded-[14px] border border-card-border bg-card p-3.5">
      <View className="mb-2.5 flex-row items-center">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-ocean-surface">
          <Text className="text-[18px]">{post.authorEmoji}</Text>
        </View>
        <View className="ml-2.5 flex-1">
          <Text className="text-[13px] font-medium text-white">{post.authorNickname}</Text>
          <Text className="mt-px text-[10px] text-muted">
            {formatTime(post.createdAt)} · {post.category}
          </Text>
        </View>
        {isMine && (
          <TouchableOpacity onPress={() => onDelete(post)}>
            <Text className="text-[12px] text-white/40">🗑️</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text className="mb-2.5 text-[13px] leading-[20px] text-white">{post.content}</Text>

      {post.imageUrl && (
        <Image
          source={{ uri: post.imageUrl }}
          style={{ width: '100%', height: 200, borderRadius: 10, marginBottom: 10 }}
          contentFit="cover"
          transition={200}
        />
      )}

      <View className="mt-1 flex-row">
        <TouchableOpacity className="mr-4" onPress={() => onToggleLike(post)}>
          <Text className={`text-[13px] ${post.likedByMe ? 'text-accent' : 'text-muted'}`}>
            {post.likedByMe ? '❤️' : '🤍'} {post.likeCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onOpenComments(post.id)}>
          <Text className="text-[13px] text-muted">💬 {post.commentCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});
