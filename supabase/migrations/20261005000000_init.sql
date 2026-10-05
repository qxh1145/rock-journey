-- Nghệ nhân tạc đá — schema + RPC (PRD v1.2 §17–19)
-- Mọi bảng bật RLS, không có policy ghi trực tiếp: client chỉ đi qua RPC security definer.

create extension if not exists pgcrypto;

-- ───────────── Tables ─────────────

create table public.question_sets (
  version    text primary key,
  active     boolean not null default false,
  created_at timestamptz not null default now()
);
-- chỉ một bộ active tại một thời điểm
create unique index question_sets_one_active on public.question_sets (active) where active;

create table public.questions (
  set_version       text not null references public.question_sets(version),
  id                text not null,
  idx               int  not null check (idx between 1 and 12),
  prompt            text not null,
  options           jsonb not null,            -- [{ "id": "a", "text": "..." }, ...]
  correct_option_id text not null,
  explanation       text not null,
  primary key (set_version, id),
  unique (set_version, idx)
);

create table public.players (
  id               uuid primary key references auth.users(id),
  email_normalized text not null unique,
  email_at_play    text not null,
  display_name     text,
  locked           boolean not null default false,
  first_seen_at    timestamptz not null default now(),
  last_seen_at     timestamptz not null default now()
);

create table public.game_sessions (
  id                   uuid primary key default gen_random_uuid(),
  player_id            uuid not null unique references public.players(id),
  status               text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS','COMPLETED')),
  question_set_version text not null references public.question_sets(version),
  started_at           timestamptz not null default now(),
  completed_at         timestamptz,
  answered_count       int not null default 0 check (answered_count between 0 and 12),
  correct_count        int not null default 0 check (correct_count between 0 and answered_count),
  mascot_stage         int generated always as (answered_count / 2) stored,  -- 0=RAW … 6=FINISHED
  qualified_for_reward boolean generated always as (status = 'COMPLETED' and answered_count = 12 and correct_count = 10) stored,
  reward_claimed       boolean not null default false,
  reward_claimed_at    timestamptz,
  reward_claimed_by    uuid references auth.users(id),
  reward_note          text,
  row_version          int not null default 0,
  check (not reward_claimed or qualified_for_reward)
);

create table public.answers (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references public.game_sessions(id),
  question_id        text not null,
  question_index     int  not null check (question_index between 1 and 12),
  selected_option_id text not null,
  is_correct         boolean not null,
  answered_at        timestamptz not null default now(),
  idempotency_key    text not null,
  unique (session_id, question_id),
  unique (session_id, question_index),
  unique (session_id, idempotency_key)
);

create table public.admin_roles (
  user_id          uuid primary key references auth.users(id),
  email_normalized text not null,
  role             text not null check (role in ('staff','admin')),
  active           boolean not null default true,
  granted_by       uuid references auth.users(id),
  granted_at       timestamptz not null default now(),
  revoked_at       timestamptz
);

create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  actor_email text,
  action      text not null,
  target_type text,
  target_id   text,
  before_json jsonb,
  after_json  jsonb,
  created_at  timestamptz not null default now(),
  request_id  text unique
);

create table public.music_playlist (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  asset_url        text not null,
  duration_seconds int,
  active           boolean not null default true,
  display_order    int not null default 0
);

alter table public.question_sets  enable row level security;
alter table public.questions      enable row level security;
alter table public.players        enable row level security;
alter table public.game_sessions  enable row level security;
alter table public.answers        enable row level security;
alter table public.admin_roles    enable row level security;
alter table public.audit_logs     enable row level security;
alter table public.music_playlist enable row level security;

-- playlist là dữ liệu công khai duy nhất được đọc trực tiếp
create policy playlist_read on public.music_playlist for select using (active);

-- ───────────── Helpers ─────────────

create function public._res(p_ok boolean, p_code text, p_message text, p_data jsonb default null)
returns jsonb language sql immutable as $$
  select jsonb_build_object('ok', p_ok, 'code', p_code, 'message', p_message, 'data', p_data)
$$;

create function public._has_role(p_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admin_roles
    where user_id = auth.uid() and active
      and (role = p_role or role = 'admin')   -- admin bao gồm quyền staff
  )
$$;

create function public._session_json(s public.game_sessions)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'session_id', s.id,
    'status', s.status,
    'answered_count', s.answered_count,
    'correct_count', s.correct_count,
    'mascot_stage', (array['RAW','CARVED_1','CARVED_2','CARVED_3','CARVED_4','CARVED_5','FINISHED'])[s.mascot_stage + 1],
    'next_question_index', case when s.status = 'IN_PROGRESS' then s.answered_count + 1 end,
    'qualified_for_reward', s.qualified_for_reward,
    'reward_claimed', s.reward_claimed,
    'title', case when s.qualified_for_reward then 'MAM_DA' end
  )
$$;

create function public._current_question(s public.game_sessions)
returns jsonb language sql stable security definer set search_path = public as $$
  -- không trả correct_option_id
  select jsonb_build_object('question_id', q.id, 'index', q.idx, 'prompt', q.prompt, 'options', q.options)
  from questions q
  where q.set_version = s.question_set_version and q.idx = s.answered_count + 1
$$;

-- ───────────── Player RPCs ─────────────

create function public.get_current_session()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s game_sessions;
begin
  if auth.uid() is null then return _res(false, 'UNAUTHENTICATED', 'Chưa đăng nhập'); end if;
  select * into s from game_sessions where player_id = auth.uid();
  if not found then return _res(true, 'NONE', 'Chưa có lượt'); end if;
  return _res(true, s.status, null, _session_json(s) || jsonb_build_object('question', _current_question(s)));
end $$;

create function public.start_session()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_user auth.users;
  v_set text;
  s game_sessions;
begin
  if v_uid is null then return _res(false, 'UNAUTHENTICATED', 'Chưa đăng nhập'); end if;
  select * into v_user from auth.users where id = v_uid;
  if v_user.email is null or v_user.email_confirmed_at is null then
    return _res(false, 'FORBIDDEN', 'Tài khoản Google cần có email đã xác thực');
  end if;

  insert into players (id, email_normalized, email_at_play, display_name)
  values (v_uid, lower(trim(v_user.email)), v_user.email, v_user.raw_user_meta_data->>'full_name')
  on conflict (id) do update set last_seen_at = now();

  if (select locked from players where id = v_uid) then
    return _res(false, 'FORBIDDEN', 'Tài khoản đã bị khóa');
  end if;

  select version into v_set from question_sets where active;
  if v_set is null then return _res(false, 'DATABASE_UNAVAILABLE', 'Chưa có bộ câu hỏi'); end if;

  -- unique(player_id) chống đua nhiều tab
  insert into game_sessions (player_id, question_set_version) values (v_uid, v_set)
  on conflict (player_id) do nothing
  returning * into s;

  if not found then
    select * into s from game_sessions where player_id = v_uid;
    return _res(false, 'SESSION_ALREADY_EXISTS', 'Đã có lượt chơi',
                _session_json(s) || jsonb_build_object('question', _current_question(s)));
  end if;
  return _res(true, 'OK', null, _session_json(s) || jsonb_build_object('question', _current_question(s)));
end $$;

create function public.get_session_state(p_session_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s game_sessions;
begin
  if auth.uid() is null then return _res(false, 'UNAUTHENTICATED', 'Chưa đăng nhập'); end if;
  select * into s from game_sessions where id = p_session_id and player_id = auth.uid();
  if not found then return _res(false, 'FORBIDDEN', 'Không tìm thấy lượt'); end if;
  return _res(true, 'OK', null, _session_json(s) || jsonb_build_object('question', _current_question(s)));
end $$;

create function public.submit_answer(p_session_id uuid, p_question_id text, p_option_id text, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s game_sessions;
  q questions;
  a answers;
  v_correct boolean;
  v_count int;
begin
  if auth.uid() is null then return _res(false, 'UNAUTHENTICATED', 'Chưa đăng nhập'); end if;
  if coalesce(length(p_idempotency_key), 0) not between 8 and 100 then
    return _res(false, 'INVALID_OPTION', 'idempotency_key không hợp lệ');
  end if;

  select * into s from game_sessions where id = p_session_id and player_id = auth.uid() for update;
  if not found then return _res(false, 'FORBIDDEN', 'Không tìm thấy lượt'); end if;

  -- retry cùng key → trả lại kết quả cũ, không cộng điểm
  select * into a from answers where session_id = s.id and idempotency_key = p_idempotency_key;
  if not found then
    if s.status = 'COMPLETED' then
      return _res(false, 'SESSION_COMPLETED', 'Lượt đã hoàn thành', _session_json(s));
    end if;
    select * into q from questions where set_version = s.question_set_version and id = p_question_id;
    if not found then return _res(false, 'INVALID_OPTION', 'Câu hỏi không tồn tại', _session_json(s)); end if;
    if exists (select 1 from answers where session_id = s.id and question_id = q.id) then
      return _res(false, 'QUESTION_ALREADY_ANSWERED', 'Câu đã được ghi nhận',
                  _session_json(s) || jsonb_build_object('question', _current_question(s)));
    end if;
    if q.idx <> s.answered_count + 1 then
      return _res(false, 'QUESTION_OUT_OF_ORDER', 'Sai thứ tự câu',
                  _session_json(s) || jsonb_build_object('question', _current_question(s)));
    end if;
    if not exists (select 1 from jsonb_array_elements(q.options) o where o->>'id' = p_option_id) then
      return _res(false, 'INVALID_OPTION', 'Lựa chọn không hợp lệ');
    end if;

    v_correct := p_option_id = q.correct_option_id;
    insert into answers (session_id, question_id, question_index, selected_option_id, is_correct, idempotency_key)
    values (s.id, q.id, q.idx, p_option_id, v_correct, p_idempotency_key)
    returning * into a;

    update game_sessions set
      answered_count = answered_count + 1,
      correct_count  = correct_count + v_correct::int,
      status         = case when answered_count + 1 = 12 then 'COMPLETED' else status end,
      completed_at   = case when answered_count + 1 = 12 then now() end,
      row_version    = row_version + 1
    where id = s.id
    returning * into s;
  else
    select * into q from questions where set_version = s.question_set_version and id = a.question_id;
  end if;

  v_count := a.question_index;  -- answered_count ngay sau câu này
  return _res(true, 'OK', null, _session_json(s) || jsonb_build_object(
    'answer', jsonb_build_object(
      'answer_id', a.id,
      'question_index', a.question_index,
      'is_correct', a.is_correct,
      'correct_option_id', q.correct_option_id,
      'explanation', q.explanation),
    -- event ID tất định theo mốc → retry không phát animation trùng
    'chisel_event_id', case when v_count % 2 = 0 then s.id::text || ':' || v_count end,
    'question', _current_question(s)
  ));
end $$;

create function public.get_result(p_session_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s game_sessions;
begin
  if auth.uid() is null then return _res(false, 'UNAUTHENTICATED', 'Chưa đăng nhập'); end if;
  select * into s from game_sessions where id = p_session_id and player_id = auth.uid();
  if not found then return _res(false, 'FORBIDDEN', 'Không tìm thấy lượt'); end if;
  if s.status <> 'COMPLETED' then return _res(false, 'CONFLICT', 'Lượt chưa hoàn thành', _session_json(s)); end if;
  return _res(true, 'OK', null, _session_json(s));
end $$;

-- ───────────── Staff RPCs ─────────────

create function public.staff_search_players(p_email text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not _has_role('staff') then return _res(false, 'FORBIDDEN', 'Không có quyền'); end if;
  return _res(true, 'OK', null, coalesce((
    select jsonb_agg(jsonb_build_object(
      'player_id', p.id, 'email', p.email_normalized,
      'session_id', s.id, 'status', coalesce(s.status, 'NONE'),
      'correct_count', s.correct_count, 'answered_count', s.answered_count,
      'completed_at', s.completed_at,
      'qualified_for_reward', coalesce(s.qualified_for_reward, false),
      'reward_claimed', coalesce(s.reward_claimed, false),
      'reward_claimed_at', s.reward_claimed_at) order by p.email_normalized)
    from (select * from players
          where email_normalized like '%' || replace(replace(lower(trim(p_email)), '%', '\%'), '_', '\_') || '%'
          order by email_normalized limit 50) p
    left join game_sessions s on s.player_id = p.id
  ), '[]'::jsonb));
end $$;

create function public.staff_claim_reward(p_session_id uuid, p_request_id text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s game_sessions; v_before jsonb;
begin
  if not _has_role('staff') then return _res(false, 'FORBIDDEN', 'Không có quyền'); end if;

  select * into s from game_sessions where id = p_session_id for update;
  if not found then return _res(false, 'CONFLICT', 'Không tìm thấy lượt'); end if;
  if s.reward_claimed then return _res(true, 'ALREADY_CLAIMED', 'Đã nhận quà trước đó', _session_json(s)); end if;
  if not s.qualified_for_reward then return _res(false, 'FORBIDDEN', 'Không đủ điều kiện', _session_json(s)); end if;

  v_before := _session_json(s);
  update game_sessions set reward_claimed = true, reward_claimed_at = now(),
         reward_claimed_by = auth.uid(), reward_note = p_note, row_version = row_version + 1
  where id = s.id returning * into s;

  insert into audit_logs (actor_id, actor_email, action, target_type, target_id, before_json, after_json, request_id)
  values (auth.uid(), auth.jwt()->>'email', 'reward_claimed', 'game_session', s.id::text, v_before, _session_json(s), p_request_id);

  return _res(true, 'OK', null, _session_json(s));
end $$;

-- ───────────── Admin RPCs ─────────────

create function public.admin_get_dashboard(p_from timestamptz default null, p_to timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not _has_role('admin') then return _res(false, 'FORBIDDEN', 'Không có quyền'); end if;
  return _res(true, 'OK', null, (
    select jsonb_build_object(
      'total_players', (select count(*) from players),
      'in_progress',   count(*) filter (where status = 'IN_PROGRESS'),
      'completed',     count(*) filter (where status = 'COMPLETED'),
      'avg_score',     round(avg(correct_count) filter (where status = 'COMPLETED'), 2),
      'qualified',     count(*) filter (where qualified_for_reward),
      'unclaimed',     count(*) filter (where qualified_for_reward and not reward_claimed),
      'claimed',       count(*) filter (where reward_claimed),
      'score_distribution', (
        select jsonb_object_agg(correct_count, n) from (
          select correct_count, count(*) n from game_sessions
          where status = 'COMPLETED'
            and (p_from is null or started_at >= p_from) and (p_to is null or started_at < p_to)
          group by 1) d)
    )
    from game_sessions
    where (p_from is null or started_at >= p_from) and (p_to is null or started_at < p_to)
  ));
end $$;

create function public.admin_export_report(p_status text default null, p_reward text default null, p_request_id text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_csv text; v_rows int;
begin
  if not _has_role('admin') then return _res(false, 'FORBIDDEN', 'Không có quyền'); end if;
  -- p_reward: NOT_QUALIFIED | QUALIFIED_UNCLAIMED | CLAIMED
  with r as (
    select p.email_normalized, s.id, s.status, s.started_at, s.completed_at, s.answered_count, s.correct_count,
           s.qualified_for_reward, s.reward_claimed, s.reward_claimed_at, s.reward_claimed_by
    from players p join game_sessions s on s.player_id = p.id
    where (p_status is null or s.status = p_status)
      and (p_reward is null or p_reward = case when s.reward_claimed then 'CLAIMED'
                                               when s.qualified_for_reward then 'QUALIFIED_UNCLAIMED'
                                               else 'NOT_QUALIFIED' end)
  )
  select count(*),
         'email,session_id,status,started_at,completed_at,answered_count,correct_count,title,qualified,reward_claimed,reward_claimed_at,reward_claimed_by' || E'\n' ||
         coalesce(string_agg(concat_ws(',',
           '"' || replace(email_normalized, '"', '""') || '"', id, status, started_at, completed_at,
           answered_count, correct_count, case when qualified_for_reward then 'Mầm Đá' end,
           qualified_for_reward, reward_claimed, reward_claimed_at, reward_claimed_by), E'\n'), '')
    into v_rows, v_csv from r;

  insert into audit_logs (actor_id, actor_email, action, target_type, after_json, request_id)
  values (auth.uid(), auth.jwt()->>'email', 'report_exported', 'report',
          jsonb_build_object('status', p_status, 'reward', p_reward, 'row_count', v_rows), p_request_id);

  return _res(true, 'OK', null, jsonb_build_object('csv', v_csv, 'row_count', v_rows));
end $$;

-- ───────────── Grants ─────────────
-- Supabase mặc định grant execute cho anon/authenticated; khóa helper và chỉ mở RPC.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.get_current_session(), public.start_session(), public.get_session_state(uuid),
  public.submit_answer(uuid, text, text, text), public.get_result(uuid),
  public.staff_search_players(text), public.staff_claim_reward(uuid, text, text),
  public.admin_get_dashboard(timestamptz, timestamptz), public.admin_export_report(text, text, text)
to authenticated;
