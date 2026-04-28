import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, getDoc, serverTimestamp, arrayUnion, arrayRemove, query, orderBy
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const CATEGORIES = ['전체', '조황 정보', '인증샷', '낚시 팁', '동출 모집'];
const SPECIES_OPTIONS = ['광어', '우럭', '감성돔', '농어', '참돔', '고등어', '갈치', '주꾸미', '볼락', '숭어', '기타'];
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/ditzwplkp/image/upload';
const UPLOAD_PRESET = 'FishingApp';

const formatTime = (timestamp) => {
  if (!timestamp) return '방금 전';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diff < 1) return '방금 전';
  if (diff < 60) return `${diff}분 전`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return date.toLocaleDateString('ko-KR');
};

export default function CommunityScreen() {
  const [activeCategory, setActiveCategory] = useState('전체');
  const [posts, setPosts] = useState([]);
  const [writeModal, setWriteModal] = useState(false);
  const [commentModal, setCommentModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [newPost, setNewPost] = useState({ category: '조황 정보', content: '' });
  const [nickname, setNickname] = useState('낚시꾼');
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [registerToLog, setRegisterToLog] = useState(false);
  const [logSpecies, setLogSpecies] = useState('광어');
  const [logSize, setLogSize] = useState('');
  const [logLocation, setLogLocation] = useState('');

  const uid = auth.currentUser?.uid;
  const selectedPost = posts.find(p => p.id === selectedPostId) || null;

  useEffect(() => {
    loadNickname();
    const q = query(collection(db, 'community_posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const loadNickname = async () => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) setNickname(snap.data().nickname || '낚시꾼');
    } catch (e) {}
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('알림', '갤러리 접근 권한이 필요해요.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const uploadToCloudinary = async (uri) => {
    const formData = new FormData();
    formData.append('file', { uri, type: 'image/jpeg', name: 'photo.jpg' });
    formData.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.secure_url) throw new Error('업로드 실패');
    return data.secure_url;
  };

  const resetWriteForm = () => {
    setNewPost({ category: '조황 정보', content: '' });
    setSelectedImage(null);
    setRegisterToLog(false);
    setLogSpecies('광어');
    setLogSize('');
    setLogLocation('');
  };

  const filtered = activeCategory === '전체' ? posts : posts.filter(p => p.category === activeCategory);

  const submitPost = async () => {
    if (!newPost.content.trim()) { Alert.alert('알림', '내용을 입력해주세요!'); return; }
    if (registerToLog && !logLocation.trim()) { Alert.alert('알림', '일지 등록을 위해 장소를 입력해주세요!'); return; }
    setSubmitting(true);
    try {
      let imageUrl = null;
      if (selectedImage) {
        setUploading(true);
        imageUrl = await uploadToCloudinary(selectedImage);
        setUploading(false);
      }

      await addDoc(collection(db, 'community_posts'), {
        uid,
        user: nickname,
        userEmoji: '🎣',
        category: newPost.category,
        content: newPost.content.trim(),
        imageUrl,
        likedBy: [],
        comments: [],
        createdAt: serverTimestamp(),
      });

      if (newPost.category === '인증샷' && registerToLog) {
        await addDoc(collection(db, 'fishing_logs'), {
          uid,
          date: new Date().toLocaleDateString('ko-KR'),
          location: logLocation.trim(),
          weather: '맑음 ☀️',
          duration: '',
          memo: newPost.content.trim(),
          catches: [{ species: logSpecies, size: logSize, count: '1', image: imageUrl }],
          rating: '보통',
          imageUrl,
          createdAt: serverTimestamp(),
        });
      }

      resetWriteForm();
      setWriteModal(false);
    } catch (e) {
      setUploading(false);
      Alert.alert('오류', '게시글 등록에 실패했어요.');
    }
    setSubmitting(false);
  };

  const toggleLike = async (post) => {
    const postRef = doc(db, 'community_posts', post.id);
    if ((post.likedBy || []).includes(uid)) {
      await updateDoc(postRef, { likedBy: arrayRemove(uid) });
    } else {
      await updateDoc(postRef, { likedBy: arrayUnion(uid) });
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !selectedPostId) return;
    const comment = {
      id: Date.now().toString(),
      uid,
      user: nickname,
      userEmoji: '🎣',
      text: newComment.trim(),
      createdAt: new Date().toISOString(),
    };
    await updateDoc(doc(db, 'community_posts', selectedPostId), { comments: arrayUnion(comment) });
    setNewComment('');
  };

  const deletePost = async (postId) => {
    Alert.alert('게시글 삭제', '정말 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await deleteDoc(doc(db, 'community_posts', postId));
        if (selectedPostId === postId) setCommentModal(false);
      }},
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 36, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c} onPress={() => setActiveCategory(c)} style={[styles.chip, activeCategory === c && styles.chipActive, { marginRight: 8 }]}>
            <Text style={[styles.chipText, activeCategory === c && { color: '#fff', fontWeight: '500' }]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          {filtered.length === 0 && (
            <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingVertical: 40, fontSize: 14 }}>
              아직 게시글이 없어요. 첫 글을 남겨보세요!
            </Text>
          )}
          {filtered.map((post) => {
            const liked = (post.likedBy || []).includes(uid);
            return (
              <View key={post.id} style={styles.postCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View style={styles.userAvatar}>
                    <Text style={{ fontSize: 18 }}>{post.userEmoji}</Text>
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>{post.user}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 1 }}>
                      {formatTime(post.createdAt)} · {post.category}
                    </Text>
                  </View>
                  {post.uid === uid && (
                    <TouchableOpacity onPress={() => deletePost(post.id)}>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={{ color: '#fff', fontSize: 13, lineHeight: 20, marginBottom: 10 }}>{post.content}</Text>

                {post.imageUrl && (
                  <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
                )}

                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                  <TouchableOpacity style={{ marginRight: 16 }} onPress={() => toggleLike(post)}>
                    <Text style={{ color: liked ? '#f4a826' : 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                      {liked ? '❤️' : '🤍'} {(post.likedBy || []).length}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setSelectedPostId(post.id); setCommentModal(true); }}>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                      💬 {(post.comments || []).length}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* 글쓰기 모달 */}
      <Modal visible={writeModal} transparent animationType="slide" onRequestClose={() => { setWriteModal(false); resetWriteForm(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>✏️ 게시글 작성</Text>
                <TouchableOpacity onPress={() => { setWriteModal(false); resetWriteForm(); }}>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20 }}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 10 }}>
                  🎣 {nickname} 으로 작성됩니다
                </Text>

                {/* 카테고리 */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {CATEGORIES.slice(1).map((c) => (
                    <TouchableOpacity key={c} onPress={() => { setNewPost({ ...newPost, category: c }); if (c !== '인증샷') setRegisterToLog(false); }} style={[styles.chip, newPost.category === c && styles.chipActive, { marginRight: 8 }]}>
                      <Text style={[styles.chipText, newPost.category === c && { color: '#fff' }]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* 내용 */}
                <TextInput
                  style={styles.textArea}
                  placeholder="낚시 이야기를 공유해주세요..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  multiline
                  numberOfLines={5}
                  value={newPost.content}
                  onChangeText={(text) => setNewPost({ ...newPost, content: text })}
                />

                {/* 사진 선택 */}
                <TouchableOpacity style={styles.imagePickBtn} onPress={pickImage}>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                    {selectedImage ? '📷 사진 변경' : '📷 사진 추가'}
                  </Text>
                </TouchableOpacity>
                {selectedImage && (
                  <View style={{ marginBottom: 12 }}>
                    <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="cover" />
                    <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.removeImageBtn}>
                      <Text style={{ color: '#fff', fontSize: 11 }}>✕ 사진 제거</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* 인증샷: 일지 등록 옵션 */}
                {newPost.category === '인증샷' && (
                  <TouchableOpacity style={styles.logRegisterToggle} onPress={() => setRegisterToLog(!registerToLog)}>
                    <View style={[styles.toggleDot, registerToLog && styles.toggleDotActive]} />
                    <Text style={{ color: registerToLog ? '#f4a826' : 'rgba(255,255,255,0.65)', fontSize: 13, marginLeft: 10 }}>
                      🎣 낚시 일지에도 등록하기
                    </Text>
                  </TouchableOpacity>
                )}

                {newPost.category === '인증샷' && registerToLog && (
                  <View style={styles.logSection}>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 8 }}>어종 선택</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                      {SPECIES_OPTIONS.map((s) => (
                        <TouchableOpacity key={s} onPress={() => setLogSpecies(s)} style={[styles.chip, logSpecies === s && styles.chipActive, { marginRight: 6 }]}>
                          <Text style={[styles.chipText, logSpecies === s && { color: '#fff' }]}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TextInput
                      style={styles.logInput}
                      placeholder="크기 (cm)"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      keyboardType="numeric"
                      value={logSize}
                      onChangeText={setLogSize}
                    />
                    <TextInput
                      style={styles.logInput}
                      placeholder="장소 *"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={logLocation}
                      onChangeText={setLogLocation}
                    />
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity style={styles.submitBtn} onPress={submitPost} disabled={submitting || uploading}>
                {submitting || uploading
                  ? <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.submitBtnText}>{uploading ? '사진 업로드 중...' : '등록 중...'}</Text>
                    </View>
                  : <Text style={styles.submitBtnText}>게시글 등록</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 댓글 모달 */}
      <Modal visible={commentModal} transparent animationType="slide" onRequestClose={() => setCommentModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>💬 댓글</Text>
                <TouchableOpacity onPress={() => setCommentModal(false)}>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20 }}>✕</Text>
                </TouchableOpacity>
              </View>
              {selectedPost && (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <Text style={{ color: '#fff', fontSize: 13, lineHeight: 20 }}>{selectedPost.content}</Text>
                </View>
              )}
              <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
                {(!selectedPost || (selectedPost.comments || []).length === 0) ? (
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', paddingVertical: 20 }}>
                    첫 댓글을 남겨보세요!
                  </Text>
                ) : (
                  (selectedPost.comments || []).map((c) => (
                    <View key={c.id} style={styles.commentItem}>
                      <Text style={{ fontSize: 16 }}>{c.userEmoji}</Text>
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '500' }}>{c.user}</Text>
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginLeft: 6 }}>
                            {formatTime(c.createdAt)}
                          </Text>
                        </View>
                        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 }}>{c.text}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
              <View style={styles.commentInput}>
                <TextInput
                  style={{ flex: 1, color: '#fff', fontSize: 13 }}
                  placeholder={`${nickname} 으로 댓글 작성...`}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={newComment}
                  onChangeText={setNewComment}
                />
                <TouchableOpacity onPress={submitComment} style={styles.commentSendBtn}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>등록</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a2a3a' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title: { color: '#fff', fontSize: 20, fontWeight: '600' },
  sub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  writeBtn: { backgroundColor: '#f4a826', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  writeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  chip: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  chipActive: { backgroundColor: '#f4a826', borderColor: '#f4a826' },
  chipText: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  postCard: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 14, marginBottom: 10 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a6a8a', alignItems: 'center', justifyContent: 'center' },
  postImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0e4060', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  textArea: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 10 },
  imagePickBtn: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  previewImage: { width: '100%', height: 180, borderRadius: 10 },
  removeImageBtn: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-end', marginTop: 6 },
  logRegisterToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(244,168,38,0.08)', borderWidth: 1, borderColor: 'rgba(244,168,38,0.3)', borderRadius: 12, padding: 14, marginBottom: 10 },
  toggleDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'transparent' },
  toggleDotActive: { backgroundColor: '#f4a826', borderColor: '#f4a826' },
  logSection: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 10 },
  logInput: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 12, color: '#fff', fontSize: 13, marginBottom: 8 },
  submitBtn: { backgroundColor: '#f4a826', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  commentItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  commentInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
  commentSendBtn: { backgroundColor: '#f4a826', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 },
});
