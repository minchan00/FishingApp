// 화면에서 쓰는 TanStack Query 훅 모음.
// 조회는 useQuery, 변경은 useMutation을 쓰고, 변경이 성공하면 관련 쿼리를 무효화해서 다시 불러온다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as dogam from '@/data/dogam';
import * as logs from '@/data/logs';
import * as points from '@/data/points';
import * as posts from '@/data/posts';
import * as profile from '@/data/profile';
import type { FishingLogInput, FishingPointInput, Post, PostInput } from '@/types/models';

export const queryKeys = {
  profile: ['profile'] as const,
  logs: ['logs'] as const,
  dogam: ['dogam'] as const,
  points: ['points'] as const,
  favorites: ['favorites'] as const,
  posts: ['posts'] as const,
  comments: (postId: number) => ['comments', postId] as const,
};

// ── 프로필 ────────────────────────────────────
export function useProfile() {
  return useQuery({ queryKey: queryKeys.profile, queryFn: profile.getMyProfile });
}

export function useUpdateNickname() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: profile.updateNickname,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile });
      qc.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
}

// ── 일지 · 도감 ───────────────────────────────
export function useLogs() {
  return useQuery({ queryKey: queryKeys.logs, queryFn: logs.listMyLogs });
}

export function useSaveLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, logId }: { input: FishingLogInput; logId?: number }) => logs.saveLog(input, logId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.logs });
      qc.invalidateQueries({ queryKey: queryKeys.dogam });
    },
  });
}

export function useDeleteLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: logs.deleteLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.logs });
      qc.invalidateQueries({ queryKey: queryKeys.dogam });
    },
  });
}

export function useDogam() {
  return useQuery({ queryKey: queryKeys.dogam, queryFn: dogam.listMyDogam });
}

export function useSaveDogamMemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ species, memo }: { species: string; memo: string }) => dogam.saveDogamMemo(species, memo),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.dogam }),
  });
}

// ── 포인트 ────────────────────────────────────
export function usePoints() {
  return useQuery({ queryKey: queryKeys.points, queryFn: points.listPoints });
}

export function useCreatePoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FishingPointInput) => points.createPoint(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.points }),
  });
}

export function useDeletePoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: points.deletePoint,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.points });
      qc.invalidateQueries({ queryKey: queryKeys.favorites });
    },
  });
}

export function useFavoritePointIds() {
  return useQuery({ queryKey: queryKeys.favorites, queryFn: points.listFavoritePointIds });
}

/** 즐겨찾기는 누르자마자 반영(낙관적 업데이트)하고, 실패하면 되돌린다. */
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pointId, favorite }: { pointId: number; favorite: boolean }) => points.setFavorite(pointId, favorite),
    onMutate: async ({ pointId, favorite }) => {
      await qc.cancelQueries({ queryKey: queryKeys.favorites });
      const prev = qc.getQueryData<number[]>(queryKeys.favorites);
      qc.setQueryData<number[]>(queryKeys.favorites, (ids = []) =>
        favorite ? [...new Set([...ids, pointId])] : ids.filter((id) => id !== pointId),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(queryKeys.favorites, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.favorites }),
  });
}

// ── 커뮤니티 ──────────────────────────────────
export function usePosts() {
  return useQuery({ queryKey: queryKeys.posts, queryFn: posts.listPosts, staleTime: 15_000 });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PostInput) => posts.createPost(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.posts }),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: posts.deletePost,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.posts }),
  });
}

/** 좋아요도 낙관적 업데이트 */
export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, liked }: { postId: number; liked: boolean }) => posts.setLike(postId, liked),
    onMutate: async ({ postId, liked }) => {
      await qc.cancelQueries({ queryKey: queryKeys.posts });
      const prev = qc.getQueryData<Post[]>(queryKeys.posts);
      qc.setQueryData<Post[]>(queryKeys.posts, (list = []) =>
        list.map((p) =>
          p.id === postId && p.likedByMe !== liked
            ? { ...p, likedByMe: liked, likeCount: p.likeCount + (liked ? 1 : -1) }
            : p,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(queryKeys.posts, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.posts }),
  });
}

export function useComments(postId: number | null) {
  return useQuery({
    queryKey: queryKeys.comments(postId ?? -1),
    queryFn: () => posts.listComments(postId!),
    enabled: postId !== null,
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, content }: { postId: number; content: string }) => posts.addComment(postId, content),
    onSuccess: (_d, { postId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.comments(postId) });
      qc.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; postId: number }) => posts.deleteComment(id),
    onSuccess: (_d, { postId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.comments(postId) });
      qc.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
}
