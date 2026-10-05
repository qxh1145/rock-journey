-- Chốt tên danh hiệu: "Mầm Nghề" (thay "Mầm Đá")
create or replace function public._session_json(s public.game_sessions)
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
    'title', case when s.qualified_for_reward then 'MAM_NGHE' end
  )
$$;
revoke execute on function public._session_json(public.game_sessions) from public, anon, authenticated;
