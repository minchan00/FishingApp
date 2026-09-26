import { z } from 'zod';
import { POST_CATEGORIES } from '@/components/community/categories';
import type { Catch, PostInput } from '@/types/models';
import { sizeTextError, speciesSchema, toSizeCm } from './log';

// DB 제약: posts.content / comments.content char_length 1~2000 / 1~500, posts.category 4가지 값
export const POST_CONTENT_MAX = 2000;
export const COMMENT_CONTENT_MAX = 500;

export const postFormSchema = z
  .object({
    category: z.enum(POST_CATEGORIES, { error: '카테고리를 선택해주세요' }),
    content: z
      .string()
      .trim()
      .min(1, '내용을 입력해주세요')
      .max(POST_CONTENT_MAX, `내용은 ${POST_CONTENT_MAX}자 이하로 입력해주세요`),
    imageUri: z.string().nullable(),
    /** '인증샷'일 때만 의미 있음: 낚시 일지에도 등록 */
    registerToLog: z.boolean(),
    logSpecies: z.string(),
    logSize: z.string(),
    logLocation: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.category !== '인증샷' || !v.registerToLog) return;
    const species = speciesSchema.safeParse(v.logSpecies);
    if (!species.success) {
      ctx.addIssue({ code: 'custom', path: ['logSpecies'], message: species.error.issues[0]?.message ?? '어종을 확인해주세요' });
    }
    const sizeError = sizeTextError(v.logSize);
    if (sizeError) ctx.addIssue({ code: 'custom', path: ['logSize'], message: sizeError });
    if (!v.logLocation.trim()) {
      ctx.addIssue({ code: 'custom', path: ['logLocation'], message: '일지 등록을 위해 장소를 입력해주세요' });
    }
  })
  .transform((v): { post: PostInput; log: { location: string; catchItem: Catch } | null } => ({
    post: { category: v.category, content: v.content, imageUri: v.imageUri },
    log:
      v.category === '인증샷' && v.registerToLog
        ? {
            location: v.logLocation.trim(),
            catchItem: { species: v.logSpecies.trim(), sizeCm: toSizeCm(v.logSize), count: 1 },
          }
        : null,
  }));

export type PostFormValues = z.input<typeof postFormSchema>;
export type PostFormOutput = z.output<typeof postFormSchema>;

export const commentFormSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, '댓글을 입력해주세요')
    .max(COMMENT_CONTENT_MAX, `댓글은 ${COMMENT_CONTENT_MAX}자 이하로 입력해주세요`),
});

export type CommentFormValues = z.input<typeof commentFormSchema>;
export type CommentFormOutput = z.output<typeof commentFormSchema>;
