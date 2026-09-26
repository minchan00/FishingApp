// supabase/migrations 스키마와 1:1로 맞춘 타입.
// Supabase 프로젝트를 연결한 뒤에는 `npm run db:types`로 자동 생성본으로 교체할 수 있다.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Insert, Update = Partial<Insert>, Rel extends Relationship[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Rel;
};

export type ProfileRow = {
  id: string;
  nickname: string;
  emoji: string;
  created_at: string;
};

export type FishingLogRow = {
  id: number;
  user_id: string;
  fished_on: string;
  location: string;
  weather: string;
  duration: string;
  memo: string;
  rating: '대박' | '보통' | '꽝';
  image_path: string | null;
  created_at: string;
};

export type CatchRow = {
  id: number;
  log_id: number;
  user_id: string;
  species: string;
  size_cm: number | null;
  count: number;
  image_path: string | null;
};

export type DogamNoteRow = {
  user_id: string;
  species: string;
  memo: string;
};

export type FishingPointRow = {
  id: number;
  user_id: string | null;
  name: string;
  address: string;
  type: string;
  species: string[];
  memo: string;
  lat: number;
  lng: number;
  hot: boolean;
  rating: number;
  created_at: string;
};

export type PointFavoriteRow = {
  user_id: string;
  point_id: number;
  created_at: string;
};

export type PostRow = {
  id: number;
  user_id: string;
  category: '조황 정보' | '인증샷' | '낚시 팁' | '동출 모집';
  content: string;
  image_path: string | null;
  created_at: string;
};

export type PostLikeRow = { post_id: number; user_id: string };

export type CommentRow = {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, { id: string; nickname: string; emoji?: string }, { nickname?: string; emoji?: string }>;
      fishing_logs: Table<FishingLogRow, Partial<Omit<FishingLogRow, 'id' | 'created_at'>>>;
      catches: Table<
        CatchRow,
        Omit<CatchRow, 'id' | 'user_id'> & { user_id?: string },
        Partial<CatchRow>,
        [
          {
            foreignKeyName: 'catches_log_id_fkey';
            columns: ['log_id'];
            isOneToOne: false;
            referencedRelation: 'fishing_logs';
            referencedColumns: ['id'];
          },
        ]
      >;
      dogam_notes: Table<DogamNoteRow, { species: string; memo?: string; user_id?: string }>;
      fishing_points: Table<
        FishingPointRow,
        Pick<FishingPointRow, 'name' | 'lat' | 'lng'> & Partial<Omit<FishingPointRow, 'id' | 'created_at'>>
      >;
      point_favorites: Table<PointFavoriteRow, { point_id: number; user_id?: string }>;
      posts: Table<PostRow, Pick<PostRow, 'category' | 'content'> & { image_path?: string | null; user_id?: string }>;
      post_likes: Table<PostLikeRow, { post_id: number; user_id?: string }>;
      comments: Table<CommentRow, { post_id: number; content: string; user_id?: string }>;
    };
    Views: {
      my_dogam: {
        Row: {
          species: string;
          best_size_cm: number | null;
          total_count: number;
          last_caught_on: string;
          best_location: string | null;
          image_path: string | null;
          memo: string;
        };
        Relationships: [];
      };
      post_feed: {
        Row: PostRow & {
          author_nickname: string;
          author_emoji: string;
          like_count: number;
          liked_by_me: boolean;
          comment_count: number;
        };
        Relationships: [];
      };
      comment_feed: {
        Row: CommentRow & { author_nickname: string; author_emoji: string };
        Relationships: [];
      };
    };
    Functions: {
      save_fishing_log: {
        Args: { p_log: Json; p_catches: Json; p_log_id?: number | null };
        Returns: number;
      };
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
