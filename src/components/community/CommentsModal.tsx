import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { errorMessage } from '@/components/log/format';
import { SheetKeyboardBody } from '@/components/log/FormParts';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { useAddComment, useComments, useDeleteComment } from '@/hooks/queries';
import { commentFormSchema, type CommentFormOutput, type CommentFormValues } from '@/schemas/post';
import { colors } from '@/theme/colors';
import type { Comment, Post } from '@/types/models';
import { formatTime } from './formatTime';
import { Avatar } from './PostCard';

type Props = {
  post: Post | null;
  visible: boolean;
  nickname: string;
  userId: string;
  onClose: () => void;
};

export function CommentsModal({ post, visible, nickname, userId, onClose }: Props) {
  const commentsQuery = useComments(visible && post ? post.id : null);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const { control, handleSubmit, reset } = useForm<CommentFormValues, unknown, CommentFormOutput>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { content: '' },
  });

  const comments = commentsQuery.data ?? [];

  const submitComment = ({ content }: CommentFormOutput) => {
    if (!post || addComment.isPending) return;
    addComment.mutate(
      { postId: post.id, content },
      {
        onSuccess: () => reset({ content: '' }),
        onError: (e) => Alert.alert('오류', errorMessage(e)),
      },
    );
  };

  const confirmDelete = (c: Comment) => {
    Alert.alert('댓글 삭제', '정말 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          deleteComment.mutate({ id: c.id, postId: c.postId }, { onError: (e) => Alert.alert('오류', errorMessage(e)) }),
      },
    ]);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="댓글" maxHeightClass="max-h-[92%]">
      <SheetKeyboardBody>
        {post && (
          <View className="mb-2 rounded-field bg-surface p-3">
            <Text className="text-label text-sub">{post.content}</Text>
          </View>
        )}
        <ScrollView className="max-h-[300px] shrink" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {commentsQuery.isPending ? (
            <ActivityIndicator color={colors.primary} className="py-8" />
          ) : commentsQuery.isError ? (
            <EmptyState
              icon="alert-circle"
              title="댓글을 불러오지 못했어요."
              actionLabel="다시 시도"
              onAction={() => commentsQuery.refetch()}
            />
          ) : comments.length === 0 ? (
            <EmptyState icon="message-circle" title="첫 댓글을 남겨보세요!" />
          ) : (
            comments.map((c) => (
              <View key={c.id} className="flex-row items-start border-b border-line py-3">
                <Avatar size={32} />
                <View className="ml-2.5 flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-label font-semibold text-ink">{c.authorNickname}</Text>
                    <Text className="ml-1.5 text-caption text-mute">{formatTime(c.createdAt)}</Text>
                  </View>
                  <Text className="mt-0.5 text-body text-ink">{c.content}</Text>
                </View>
                {c.authorId === userId && (
                  <Pressable
                    onPress={() => confirmDelete(c)}
                    accessibilityLabel="댓글 삭제"
                    className="-mr-2 h-8 w-8 items-center justify-center rounded-full active:bg-surface"
                  >
                    <Icon name="trash-2" size={15} color={colors.mute} />
                  </Pressable>
                )}
              </View>
            ))
          )}
        </ScrollView>

        <View className="mt-3 flex-row items-start gap-2">
          <Controller
            control={control}
            name="content"
            render={({ field, fieldState }) => (
              <TextField
                ref={field.ref}
                className="flex-1"
                placeholder={`${nickname} 으로 댓글 작성...`}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                returnKeyType="send"
                onSubmitEditing={handleSubmit(submitComment)}
              />
            )}
          />
          <Button
            label="등록"
            size="md"
            block={false}
            className="mt-1"
            onPress={handleSubmit(submitComment)}
            loading={addComment.isPending}
          />
        </View>
      </SheetKeyboardBody>
    </BottomSheet>
  );
}
