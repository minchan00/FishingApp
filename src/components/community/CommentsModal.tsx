import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { errorMessage } from '@/components/log/format';
import { useAddComment, useComments, useDeleteComment } from '@/hooks/queries';
import { colors } from '@/theme/colors';
import type { Comment, Post } from '@/types/models';
import { formatTime } from './formatTime';

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
  const [newComment, setNewComment] = useState('');

  const comments = commentsQuery.data ?? [];

  const submitComment = () => {
    if (!newComment.trim() || !post || addComment.isPending) return;
    addComment.mutate(
      { postId: post.id, content: newComment.trim() },
      {
        onSuccess: () => setNewComment(''),
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💬 댓글</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            {post && (
              <View style={styles.postPreview}>
                <Text style={{ color: colors.white, fontSize: 13, lineHeight: 20 }}>{post.content}</Text>
              </View>
            )}
            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
              {commentsQuery.isPending ? (
                <ActivityIndicator color={colors.accent} style={{ paddingVertical: 20 }} />
              ) : commentsQuery.isError ? (
                <Text style={styles.emptyText}>댓글을 불러오지 못했어요.</Text>
              ) : comments.length === 0 ? (
                <Text style={styles.emptyText}>첫 댓글을 남겨보세요!</Text>
              ) : (
                comments.map((c) => (
                  <View key={c.id} style={styles.commentItem}>
                    <Text style={{ fontSize: 16 }}>{c.authorEmoji}</Text>
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: colors.white, fontSize: 12, fontWeight: '500' }}>{c.authorNickname}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginLeft: 6 }}>
                          {formatTime(c.createdAt)}
                        </Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 }}>{c.content}</Text>
                    </View>
                    {c.authorId === userId && (
                      <TouchableOpacity onPress={() => confirmDelete(c)} style={{ paddingLeft: 8 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
            <View style={styles.commentInput}>
              <TextInput
                style={{ flex: 1, color: colors.white, fontSize: 13 }}
                placeholder={`${nickname} 으로 댓글 작성...`}
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={newComment}
                onChangeText={setNewComment}
              />
              <TouchableOpacity onPress={submitComment} style={styles.commentSendBtn} disabled={addComment.isPending}>
                {addComment.isPending ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={{ color: colors.white, fontSize: 12, fontWeight: '600' }}>등록</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.oceanMid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.white, fontSize: 16, fontWeight: '600' },
  postPreview: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, marginBottom: 12 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  commentItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  commentInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
  commentSendBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 },
});
