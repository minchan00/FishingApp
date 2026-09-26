-- 회원 탈퇴는 delete-account Edge Function이 처리한다.
-- 운영 Supabase는 SQL에서 storage.objects를 직접 지우는 것을 막아 이 함수가 실패했다.
drop function if exists public.delete_my_account();
