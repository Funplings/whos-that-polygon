-- Global results backend (Supabase project `whos-that-polygon`,
-- ref ourtbcuodsjseemfnldf). Already applied there; kept here so the schema
-- lives with the code. Client side: src/lib/globalResults.ts.

-- One row per device per puzzle day. Players are anonymous: client_id is a
-- random UUID the browser keeps in localStorage.
create table public.daily_results (
  puzzle_date date not null,
  client_id uuid not null,
  guesses smallint not null check (guesses between 1 and 3),
  won boolean not null,
  created_at timestamptz not null default now(),
  primary key (puzzle_date, client_id),
  -- A loss always uses every guess.
  check (won or guesses = 3)
);

-- No policies: the table is unreachable through the API except via the two
-- security-definer functions below.
alter table public.daily_results enable row level security;
revoke all on public.daily_results from anon, authenticated;

-- Records a finished game. The first result per device per day stands, so
-- replaying or re-submitting can't inflate the counts. Dates outside the
-- schedule's lifetime (before launch, or more than a day in the future) are
-- ignored.
create function public.submit_result(
  p_date date,
  p_client uuid,
  p_guesses smallint,
  p_won boolean
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.daily_results (puzzle_date, client_id, guesses, won)
  select p_date, p_client, p_guesses, p_won
  where p_date between date '2026-08-17' and (now() at time zone 'America/New_York')::date + 1
  on conflict (puzzle_date, client_id) do nothing;
$$;

-- Aggregate counts for one day: solves in 1, 2, 3 guesses, and misses.
create function public.get_results(p_date date)
returns table (one bigint, two bigint, three bigint, failed bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) filter (where won and guesses = 1),
    count(*) filter (where won and guesses = 2),
    count(*) filter (where won and guesses = 3),
    count(*) filter (where not won)
  from public.daily_results
  where puzzle_date = p_date;
$$;

revoke execute on function public.submit_result(date, uuid, smallint, boolean) from public;
revoke execute on function public.get_results(date) from public;
grant execute on function public.submit_result(date, uuid, smallint, boolean) to anon, authenticated;
grant execute on function public.get_results(date) to anon, authenticated;
