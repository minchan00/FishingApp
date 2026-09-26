// EXPO_PUBLIC_ 값은 빌드 시 코드에 치환된다. 반드시 process.env.EXPO_PUBLIC_XXX 형태로 직접 접근해야 한다.
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`환경변수 ${name}가 설정되지 않았어요. .env.example을 참고해 .env를 만들어주세요.`);
  return value;
}

export const env = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  weatherApiKey: process.env.EXPO_PUBLIC_WEATHER_API_KEY ?? '',
  tideApiKey: process.env.EXPO_PUBLIC_TIDE_API_KEY ?? '',
  /** 비어 있으면 Sentry를 켜지 않는다 */
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
};
