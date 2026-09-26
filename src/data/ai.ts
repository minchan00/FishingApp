import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import type { FishAnalysis } from '@/types/models';

const ANALYZE_WIDTH = 1024; // 어종 판별에 충분한 크기. 원본을 보내면 느리고 요청 크기 제한에 걸린다

export type AiErrorCode = 'DAILY_LIMIT' | 'AI_BUSY' | 'AI_FAILED' | 'NETWORK' | 'UNKNOWN';

/** 화면에서 오류 종류별로 다르게 안내할 수 있도록 code를 담는다. */
export class AiError extends Error {
  constructor(public code: AiErrorCode, message: string) {
    super(message);
  }
}

/** 어종 분석. 사진을 줄여서 Edge Function(identify-fish)에 보내고, Groq 호출은 서버에서 한다. */
export async function identifyFish(localUri: string): Promise<FishAnalysis> {
  const rendered = await ImageManipulator.manipulate(localUri).resize({ width: ANALYZE_WIDTH }).renderAsync();
  const { base64 } = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  if (!base64) throw new AiError('UNKNOWN', '이미지를 읽을 수 없어요.');

  const { data, error } = await supabase.functions.invoke<FishAnalysis>('identify-fish', {
    body: { imageBase64: base64 },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body: { code?: string; error?: string } | null = await error.context.json().catch(() => null);
      const code = body?.code === 'DAILY_LIMIT' || body?.code === 'AI_BUSY' ? body.code : 'AI_FAILED';
      throw new AiError(code, body?.error ?? 'AI 분석에 실패했어요.');
    }
    if (error instanceof FunctionsFetchError) {
      throw new AiError('NETWORK', '인터넷 연결을 확인해주세요.');
    }
    throw new AiError('UNKNOWN', 'AI 분석 서버에 연결할 수 없어요.');
  }
  if (!data) throw new AiError('AI_FAILED', '분석 결과를 가져올 수 없어요.');
  return data;
}
