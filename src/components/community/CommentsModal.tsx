import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { AppModal, SheetPanel } from '@/components/ui/Sheet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { errorMessage } from '@/components/log/format';
import { FieldError, FormTextInput } from '@/components/log/FormTextInput';
import { useAddComment, useComments, useDeleteComment } from '@/hooks/queries';
import { commentFormSchema, type CommentFormOutput, type CommentFormValues } from '@/schemas/post';
import { colors } from '@/theme/colors';
import type { Comment, Post } from '@/types/models';
import { formatTime } from './formatTime';

const EMPTY_TEXT = 'py-5 text-center text-[13px] text-white/40';

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
  const { control, handleSubmit, reset, formState } = useForm<CommentFormValues, unknown, CommentFormOutput>({
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
    <AppModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1 justify-end bg-black/70">
          <SheetPanel className="max-h-[92%] rounded-t-3xl bg-ocean-mid p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[16px] font-semibold text-white">💬 댓글</Text>
              <TouchableOpacity onPress={onClose}>
                <Text className="text-[20px] text-muted">✕</Text>
              </TouchableOpacity>
            </View>
            {post && (
              <View className="mb-3 rounded-[10px] bg-white/5 p-3">
                <Text className="text-[13px] leading-[20px] text-white">{post.content}</Text>
              </View>
            )}
            <ScrollView className="max-h-[250px]" showsVerticalScrollIndicator={false}>
              {commentsQuery.isPending ? (
                <ActivityIndicator color={colors.accent} className="py-5" />
              ) : commentsQuery.isError ? (
                <Text className={EMPTY_TEXT}>댓글을 불러오지 못했어요.</Text>
              ) : comments.length === 0 ? (
                <Text className={EMPTY_TEXT}>첫 댓글을 남겨보세요!</Text>
              ) : (
                comments.map((c) => (
                  <View key={c.id} className="flex-row items-start border-b border-white/[0.08] py-2.5">
                    <Text className="text-[16px]">{c.authorEmoji}</Text>
                    <View className="ml-2 flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-[12px] font-medium text-white">{c.authorNickname}</Text>
                        <Text className="ml-1.5 text-[10px] text-white/40">{formatTime(c.createdAt)}</Text>
                      </View>
                      <Text className="mt-0.5 text-[13px] text-white/85">{c.content}</Text>
                    </View>
                    {c.authorId === userId && (
                      <TouchableOpacity onPress={() => confirmDelete(c)} className="pl-2">
                        <Text className="text-[12px] text-white/40">🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
            <View className="mt-3 flex-row items-center rounded-xl border border-card-border bg-card px-3.5 py-2.5">
              <FormTextInput
                control={control}
                name="content"
                showError={false}
                className="flex-1 text-[13px] text-white"
                placeholder={`${nickname} 으로 댓글 작성...`}
              />
              <TouchableOpacity
                onPress={handleSubmit(submitComment)}
                className="ml-2 rounded-lg bg-accent px-3 py-1.5"
                disabled={addComment.isPending}
              >
                {addComment.isPending ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text className="text-[12px] font-semibold text-white">등록</Text>
                )}
              </TouchableOpacity>
            </View>
            <FieldError message={formState.errors.content?.message} spacing="mt-1.5" />
          </SheetPanel>
        </View>
      </KeyboardAvoidingView>
    </AppModal>
  );
}
