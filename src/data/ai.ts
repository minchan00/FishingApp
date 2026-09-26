import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/** 어종 분석. Groq 호출은 Edge Function(identify-fish)이 서버에서 한다. */
export async function identifyFish(imageBase64: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ result: string }>('identify-fish', {
    body: { imageBase64 },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new Error(body?.error ?? 'AI 분석에 실패했어요.');
    }
    throw new Error('AI 분석 서버에 연결할 수 없어요.');
  }
  if (!data?.result) throw new Error('분석 결과를 가져올 수 없어요.');
  return data.result;
}

/** 분석 결과 텍스트에서 "🐟 어종명: 광어" 부분을 뽑는다. */
export function extractSpeciesName(result: string): string | null {
  const match = result.match(/어종명\s*[:：]\s*([^\n(]+)/);
  return match?.[1]?.trim() || null;
}
