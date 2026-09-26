import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase, currentUserId } from '@/lib/supabase';

const BUCKET = 'photos';
const MAX_WIDTH = 1280; // 무료 플랜 저장 용량(1GB)을 아끼기 위해 업로드 전에 줄인다

export function photoUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** 공개 URL → 저장 경로. 이 버킷의 URL이 아니면 null. */
function pathFromUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

/**
 * 화면에서 넘어온 이미지 값을 저장 경로로 바꾼다.
 * - null → null
 * - 이미 올라간 사진의 공개 URL → 기존 경로 그대로
 * - 로컬 파일 URI → 압축 후 업로드하고 새 경로 반환
 */
export async function resolvePhoto(uri: string | null): Promise<string | null> {
  if (!uri) return null;
  if (/^https?:\/\//.test(uri)) return pathFromUrl(uri);
  return uploadPhoto(uri);
}

// 같은 사진을 일지와 커뮤니티에 동시에 올릴 때 두 번 업로드하지 않도록 로컬 URI별로 기억한다
const uploaded = new Map<string, Promise<string>>();

export function uploadPhoto(localUri: string): Promise<string> {
  let pending = uploaded.get(localUri);
  if (!pending) {
    pending = doUpload(localUri);
    pending.catch(() => uploaded.delete(localUri));
    uploaded.set(localUri, pending);
  }
  return pending;
}

async function doUpload(localUri: string): Promise<string> {
  const userId = await currentUserId();

  const rendered = await ImageManipulator.manipulate(localUri).resize({ width: MAX_WIDTH }).renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  const body = await (await fetch(saved.uri)).arrayBuffer();

  // 스토리지 정책상 첫 폴더가 본인 uid여야 업로드가 허용된다
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw new Error(`사진 업로드 실패: ${error.message}`);
  return path;
}
