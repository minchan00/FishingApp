import { supabase, unwrap, check } from '@/lib/supabase';
import type { Comment, Post, PostInput } from '@/types/models';
import { photoUrl, resolvePhoto } from './photos';

export async function listPosts(): Promise<Post[]> {
  const rows = unwrap(await supabase.from('post_feed').select('*').order('created_at', { ascending: false }).limit(100));
  return rows.map((r) => ({
    id: r.id,
    authorId: r.user_id,
    authorNickname: r.author_nickname,
    authorEmoji: r.author_emoji,
    category: r.category,
    content: r.content,
    imageUrl: photoUrl(r.image_path),
    likeCount: r.like_count,
    likedByMe: r.liked_by_me,
    commentCount: r.comment_count,
    createdAt: r.created_at,
  }));
}

export async function createPost(input: PostInput): Promise<void> {
  const imagePath = await resolvePhoto(input.imageUri);
  check(await supabase.from('posts').insert({ category: input.category, content: input.content.trim(), image_path: imagePath }));
}

/** 본인 글만 삭제된다(RLS). 권한이 없으면 에러. */
export async function deletePost(id: number): Promise<void> {
  const rows = unwrap(await supabase.from('posts').delete().eq('id', id).select('id'));
  if (rows.length === 0) throw new Error('내가 쓴 글만 삭제할 수 있어요.');
}

export async function setLike(postId: number, liked: boolean): Promise<void> {
  if (liked) {
    check(await supabase.from('post_likes').upsert({ post_id: postId }, { onConflict: 'post_id,user_id', ignoreDuplicates: true }));
  } else {
    check(await supabase.from('post_likes').delete().eq('post_id', postId));
  }
}

export async function listComments(postId: number): Promise<Comment[]> {
  const rows = unwrap(
    await supabase.from('comment_feed').select('*').eq('post_id', postId).order('created_at', { ascending: true }),
  );
  return rows.map((r) => ({
    id: r.id,
    postId: r.post_id,
    authorId: r.user_id,
    authorNickname: r.author_nickname,
    authorEmoji: r.author_emoji,
    content: r.content,
    createdAt: r.created_at,
  }));
}

export async function addComment(postId: number, content: string): Promise<void> {
  check(await supabase.from('comments').insert({ post_id: postId, content: content.trim() }));
}

export async function deleteComment(id: number): Promise<void> {
  check(await supabase.from('comments').delete().eq('id', id));
}
