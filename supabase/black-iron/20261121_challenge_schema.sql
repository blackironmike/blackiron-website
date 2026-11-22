-- Black Iron Athletics: challenge app schema (Rally Point is the first challenge).
-- Lives in the `black-iron` Supabase project, NOT the FuelPath project the
-- other files in supabase/ belong to.
--
-- Shape: reference + member tables in `public` with RLS on every table.
-- All writes that carry rules (team assignment, logging points, approvals)
-- go through SECURITY DEFINER functions in the private `app` schema, each of
-- which checks auth.uid() itself. `public` only holds thin SECURITY INVOKER
-- wrappers so the Data API can reach them.

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to anon, authenticated, service_role;

-- ------------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------------
create table public.challenges (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  starts_on date not null,
  scoring_starts_on date not null,
  ends_on date not null,
  is_active boolean not null default false,
  -- Sign up before this date and you earn the early sign-up points. When it is
  -- empty the cutoff is the day scoring starts.
  early_signup_until date,
  -- Who can reserve classes inside the app: nobody, the admin (while testing), or every verified member.
  reservations text not null default 'admin' check (reservations in ('off', 'admin', 'all'))
);
create unique index challenges_one_active on public.challenges (is_active) where is_active;

create table public.teams (
  id smallint generated always as identity primary key,
  challenge_id smallint not null references public.challenges(id) on delete cascade,
  name text not null,
  captain_name text not null,
  captain_photo text,
  sort smallint not null default 0
);
create index teams_challenge on public.teams (challenge_id);

create table public.weeks (
  challenge_id smallint not null references public.challenges(id) on delete cascade,
  week_no smallint not null,
  starts_on date not null,
  focus text,
  double_category text,
  primary key (challenge_id, week_no)
);

create table public.ranks (
  challenge_id smallint not null references public.challenges(id) on delete cascade,
  name text not null,
  min_points int not null,
  primary key (challenge_id, min_points)
);

create table public.point_categories (
  challenge_id smallint not null references public.challenges(id) on delete cascade,
  key text not null,
  label text not null,
  hint text,
  points int not null,
  logged_by text not null check (logged_by in ('member','coach','auto')),
  proof text not null default 'none' check (proof in ('none','photo','link_or_photo')),
  per text not null default 'any' check (per in ('day','week','once','mission','any')),
  max_total int,
  team_only boolean not null default false,
  allowed_pre boolean not null default false,
  active boolean not null default true,
  sort smallint not null default 0,
  primary key (challenge_id, key)
);

create table public.missions (
  id bigint generated always as identity primary key,
  challenge_id smallint not null references public.challenges(id) on delete cascade,
  week_no smallint,
  sort smallint not null default 0,
  title text not null check (char_length(title) <= 80),
  detail text check (char_length(detail) <= 200),
  category_key text not null,
  target_count smallint not null default 1,
  points_label int not null default 0,
  bonus_points int not null default 0 check (bonus_points between 0 and 50),
  is_flash boolean not null default false,
  opens_at timestamptz,
  closes_at timestamptz,
  status text not null default 'draft' check (status in ('draft','live')),
  created_by uuid
);
create index missions_week on public.missions (challenge_id, week_no);

-- What other members can see about you.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  photo_path text,
  why_i_train text check (char_length(why_i_train) <= 140),
  usual_class text check (char_length(usual_class) <= 20),
  show_on_tv boolean,
  adult_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint photo_in_own_folder check (photo_path is null or photo_path like id::text || '/%')
);

-- What only you and the coaches can see. Never written by the client.
create table public.profile_private (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  role text not null default 'member' check (role in ('member','coach','admin')),
  verified boolean not null default false,
  wodify_client_id int,
  coach_team text,
  created_at timestamptz not null default now()
);
create index profile_private_wodify on public.profile_private (wodify_client_id);

create table public.team_members (
  challenge_id smallint not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id smallint not null references public.teams(id),
  is_captain boolean not null default false,
  revealed boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index team_members_team on public.team_members (team_id);
create index team_members_user on public.team_members (user_id);

create table public.entries (
  id bigint generated always as identity primary key,
  challenge_id smallint not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id smallint not null references public.teams(id),
  category_key text not null,
  mission_id bigint references public.missions(id) on delete set null,
  week_no smallint,
  activity_date date not null,
  points int not null,
  team_only boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  source text not null check (source in ('member','coach','auto','wodify')),
  photo_path text,
  link_url text check (char_length(link_url) <= 500),
  caption text check (char_length(caption) <= 200),
  auto_approved boolean not null default false,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index entries_user on public.entries (challenge_id, user_id);
create index entries_team on public.entries (challenge_id, team_id, status);
create index entries_mission on public.entries (mission_id) where mission_id is not null;
create index entries_photo on public.entries (photo_path) where photo_path is not null;
create unique index entries_wodify_once on public.entries (challenge_id, user_id, activity_date) where source = 'wodify';
create unique index entries_once on public.entries (challenge_id, user_id, category_key) where category_key in ('profile','original','team_signup');
create unique index entries_sweep_once on public.entries (challenge_id, user_id, week_no) where category_key = 'clean_sweep';
create unique index entries_mission_bonus_once on public.entries (user_id, mission_id) where category_key = 'mission_bonus';

create table public.invites (
  code text primary key,
  challenge_id smallint not null references public.challenges(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  clicks int not null default 0,
  created_at timestamptz not null default now(),
  unique (challenge_id, inviter_id)
);
create index invites_inviter on public.invites (inviter_id);

-- Private: the gym's member list and class check-ins, loaded from Wodify.
create table app.roster (
  email text primary key,
  first_name text,
  last_name text,
  wodify_client_id int,
  role text not null default 'member' check (role in ('member','coach','admin')),
  coach_team text,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  -- Filled by the daily Wodify sync. Phone and texting status are only ever
  -- shown to a team captain for their own team (and to the admin).
  phone text,
  sms_status text,
  next_birthday date,
  member_since date,
  last_class_date date,
  -- Set true for anyone who asks to be left off birthday and anniversary shoutouts.
  skip_shoutouts boolean not null default false
);
create table app.attendance (
  wodify_client_id int not null,
  class_date date not null,
  class_name text,
  -- One check-in is credited per member per day. A class beats Open Gym on the same day.
  kind text not null default 'class' check (kind in ('class', 'open_gym')),
  primary key (wodify_client_id, class_date)
);
-- Private: the day's workout as members and their guests see it. Preview level
-- only: the main pieces exactly as Coach Mike wrote them, with no warm-up and
-- no coach's notes. parts is [{"name": "...", "lines": ["...", "..."]}].
-- Nothing shows until a day is marked published.
create table app.workouts (
  workout_date date primary key,
  parts jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint workout_parts_is_list check (jsonb_typeof(parts) = 'array')
);
alter table app.roster enable row level security;
alter table app.attendance enable row level security;
alter table app.workouts enable row level security;

-- ------------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------------
create function app.today() returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Chicago')::date
$$;

create function app.is_verified() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profile_private where id = (select auth.uid()) and verified)
$$;
-- Called by api/challenge-reserve.js with the member's own sign-in token. Answers with
-- that member's Wodify ID and whether reserving is switched on for them.
create function app.reserve_identity() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); pp public.profile_private%rowtype; v_mode text; v_client int;
begin
  if v_uid is null then raise exception 'Sign in first.'; end if;
  select * into pp from public.profile_private where id = v_uid;
  if not found or not pp.verified then raise exception 'Finish signing up first.'; end if;
  v_client := coalesce(pp.wodify_client_id,
    (select r.wodify_client_id from app.roster r where lower(r.email) = lower(pp.email) and r.active limit 1));
  select c.reservations into v_mode from public.challenges c where c.is_active limit 1;
  return jsonb_build_object(
    'client_id', v_client,
    'allowed', v_client is not null and (v_mode = 'all' or (v_mode = 'admin' and pp.role = 'admin')));
end $$;
create function app.is_coach() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profile_private where id = (select auth.uid()) and role in ('coach','admin'))
$$;
create function app.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profile_private where id = (select auth.uid()) and role = 'admin')
$$;

create function app.week_no(p_ch smallint, p_d date) returns int language sql stable security definer set search_path = '' as $$
  select max(week_no)::int from public.weeks where challenge_id = p_ch and starts_on <= p_d
$$;

create function app.mission_count(p_uid uuid, m public.missions, p_status text) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.entries e
  where e.challenge_id = m.challenge_id and e.user_id = p_uid and e.status = p_status
    and e.category_key = m.category_key
    and case
      when m.is_flash then e.mission_id = m.id
      when (select c.per from public.point_categories c where c.challenge_id = m.challenge_id and c.key = m.category_key) = 'once' then true
      else e.week_no = m.week_no
    end
$$;

create function app.team_board(p_ch smallint) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'name', t.name, 'captain_name', t.captain_name, 'captain_photo', t.captain_photo,
    'members', (select count(*) from public.team_members m where m.team_id = t.id and not m.is_captain),
    'points', (select coalesce(sum(e.points), 0) from public.entries e where e.team_id = t.id and e.status = 'approved'),
    'week_points', (select coalesce(sum(e.points), 0) from public.entries e where e.team_id = t.id and e.status = 'approved'
                    and e.week_no = app.week_no(p_ch, app.today()))
  ) order by t.sort), '[]'::jsonb)
  from public.teams t where t.challenge_id = p_ch
$$;

-- Creates the caller's profile rows on first visit and matches them to the roster.
-- Only a confirmed email address can match the roster.
create function app.ensure_profile() returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text; v_meta jsonb; v_full text; v_name text;
  r app.roster%rowtype;
begin
  if v_uid is null then raise exception 'Sign in first.'; end if;
  select lower(u.email), u.raw_user_meta_data into v_email, v_meta
  from auth.users u where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null then raise exception 'Confirm your email first.'; end if;
  select * into r from app.roster where email = v_email and active;

  if not exists (select 1 from public.profile_private where id = v_uid) then
    insert into public.profile_private (id, email, first_name, last_name, role, verified, wodify_client_id, coach_team)
    values (v_uid, v_email, r.first_name, r.last_name, coalesce(r.role, 'member'), r.email is not null, r.wodify_client_id, r.coach_team);
  elsif r.email is not null then
    update public.profile_private x set
      verified = true,
      first_name = coalesce(x.first_name, r.first_name),
      last_name = coalesce(x.last_name, r.last_name),
      wodify_client_id = coalesce(x.wodify_client_id, r.wodify_client_id),
      role = case when x.role = 'member' then r.role else x.role end,
      coach_team = coalesce(x.coach_team, r.coach_team)
    where x.id = v_uid and (not x.verified or x.wodify_client_id is null or (x.role = 'member' and r.role <> 'member'));
  end if;

  if not exists (select 1 from public.profiles where id = v_uid) then
    -- user_metadata is only used here to suggest a display name, never for access.
    v_full := nullif(trim(coalesce(v_meta->>'full_name', v_meta->>'name', '')), '');
    if r.first_name is not null then
      v_name := r.first_name || coalesce(' ' || left(r.last_name, 1) || '.', '');
    elsif v_full is not null then
      v_name := split_part(v_full, ' ', 1)
        || case when position(' ' in v_full) > 0 then ' ' || left(split_part(v_full, ' ', 2), 1) || '.' else '' end;
    else
      v_name := initcap(split_part(v_email, '@', 1));
    end if;
    insert into public.profiles (id, display_name) values (v_uid, left(v_name, 40));
    -- A coach who leads a team is set up for them: their team name for display and the two
    -- profile choices already made, so there is nothing to upload or tick. Their headshot is
    -- the team's captain photo, which the app shows for captains. (photo_path has to stay
    -- inside the member's own upload folder: check constraint photo_in_own_folder.)
    if r.role in ('coach', 'admin') and r.coach_team is not null then
      update public.profiles p set display_name = t.captain_name, show_on_tv = true, adult_confirmed = true
      from public.teams t join public.challenges ch on ch.id = t.challenge_id and ch.is_active
      where p.id = v_uid and t.name = r.coach_team;
    end if;
  end if;
end $$;

-- Member entries nobody reviewed in 48 hours count automatically.
-- The photo still stays off the feed and TV until a coach looks at it.
create function app.sweep(p_ch smallint) returns void language sql security definer set search_path = '' as $$
  update public.entries set status = 'approved', auto_approved = true, reviewed_at = now()
  where challenge_id = p_ch and status = 'pending' and source = 'member'
    and created_at < now() - interval '48 hours'
$$;

create function app.add_auto(p_uid uuid, p_ch smallint, p_team smallint, p_key text, p_week int) returns void
language sql security definer set search_path = '' as $$
  insert into public.entries (challenge_id, user_id, team_id, category_key, week_no, activity_date, points, team_only, status, source)
  select p_ch, p_uid, p_team, c.key, coalesce(p_week, app.week_no(p_ch, app.today())), app.today(), c.points, c.team_only, 'approved', 'auto'
  from public.point_categories c
  where c.challenge_id = p_ch and c.key = p_key and c.active
  on conflict do nothing
$$;

create function app.post_attendance_for(p_ch smallint, p_uid uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.entries as t (challenge_id, user_id, team_id, category_key, week_no, activity_date, points, team_only, status, source)
  select ch.id, x.id, tm.team_id, c.key, app.week_no(ch.id, a.class_date), a.class_date, c.points, false, 'approved', 'wodify'
  from public.challenges ch
  join public.team_members tm on tm.challenge_id = ch.id and (p_uid is null or tm.user_id = p_uid)
  join public.profile_private x on x.id = tm.user_id and x.wodify_client_id is not null
  join app.attendance a on a.wodify_client_id = x.wodify_client_id
  join public.point_categories c on c.challenge_id = ch.id and c.key = a.kind and c.active
  where ch.id = p_ch and a.class_date between ch.scoring_starts_on and ch.ends_on
  on conflict (challenge_id, user_id, activity_date) where source = 'wodify'
  do update set category_key = excluded.category_key, points = excluded.points
  where t.category_key = 'open_gym' and excluded.category_key = 'class'
$$;

create function app.award_auto(p_uid uuid, p_ch smallint) returns void language plpgsql security definer set search_path = '' as $$
declare
  tm public.team_members%rowtype; p public.profiles%rowtype; ch public.challenges%rowtype;
  w record; v_total int; v_done int;
begin
  select * into tm from public.team_members where challenge_id = p_ch and user_id = p_uid;
  -- Captains earn points for their team like any athlete (Coach Mike, Nov 22).
  if not found then return; end if;
  select * into p from public.profiles where id = p_uid;
  select * into ch from public.challenges where id = p_ch;

  -- A captain's photo is their site headshot, so only the "why I train" line is needed.
  if (p.photo_path is not null or tm.is_captain) and coalesce(trim(p.why_i_train), '') <> '' then
    perform app.add_auto(p_uid, p_ch, tm.team_id, 'profile', null);
  end if;
  if (tm.joined_at at time zone 'America/Chicago')::date < coalesce(ch.early_signup_until, ch.scoring_starts_on) then
    perform app.add_auto(p_uid, p_ch, tm.team_id, 'original', null);
    perform app.add_auto(p_uid, p_ch, tm.team_id, 'team_signup', null);
  end if;
  perform app.post_attendance_for(p_ch, p_uid);

  -- A mission with a bonus pays it once, when the member hits the target.
  insert into public.entries (challenge_id, user_id, team_id, category_key, mission_id, week_no, activity_date, points, team_only, status, source)
  select p_ch, p_uid, tm.team_id, 'mission_bonus', m.id, m.week_no, app.today(), m.bonus_points, false, 'approved', 'auto'
  from public.missions m
  where m.challenge_id = p_ch and m.status = 'live' and not m.is_flash and m.bonus_points > 0
    and app.mission_count(p_uid, m, 'approved') >= m.target_count
  on conflict do nothing;

  for w in select week_no from public.weeks where challenge_id = p_ch and starts_on <= app.today() loop
    select count(*), count(*) filter (where app.mission_count(p_uid, m, 'approved') >= m.target_count)
      into v_total, v_done
    from public.missions m
    where m.challenge_id = p_ch and m.week_no = w.week_no and m.status = 'live' and not m.is_flash;
    if v_total > 0 and v_done = v_total then
      perform app.add_auto(p_uid, p_ch, tm.team_id, 'clean_sweep', w.week_no);
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------------
-- Member functions
-- ------------------------------------------------------------------
create function app.bootstrap() returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  ch public.challenges%rowtype; pp public.profile_private%rowtype; p public.profiles%rowtype; tm public.team_members%rowtype;
  v_today date := app.today(); v_wk int; v_phase text;
begin
  perform app.ensure_profile();
  select * into ch from public.challenges where is_active limit 1;
  if not found then raise exception 'No challenge is running right now.'; end if;
  perform app.sweep(ch.id);
  -- A coach who leads a team lands on it as captain without a sign-up step.
  if exists (select 1 from public.profile_private x where x.id = v_uid and x.role in ('coach', 'admin') and x.coach_team is not null)
     and exists (select 1 from public.profiles q where q.id = v_uid and q.adult_confirmed and q.show_on_tv is not null)
     and not exists (select 1 from public.team_members t where t.challenge_id = ch.id and t.user_id = v_uid) then
    perform app.join_challenge();
  end if;
  perform app.award_auto(v_uid, ch.id);
  select * into pp from public.profile_private where id = v_uid;
  select * into p from public.profiles where id = v_uid;
  select * into tm from public.team_members where challenge_id = ch.id and user_id = v_uid;
  v_wk := coalesce(app.week_no(ch.id, v_today), 0);
  v_phase := case when v_today < ch.scoring_starts_on then 'pre' when v_today > ch.ends_on then 'done' else 'live' end;

  return jsonb_build_object(
    'challenge', to_jsonb(ch), 'today', v_today, 'week_no', v_wk, 'phase', v_phase,
    'me', to_jsonb(p) || jsonb_build_object('email', pp.email, 'role', pp.role, 'verified', pp.verified, 'first_name', pp.first_name),
    'membership', case when tm.user_id is null then null else
      jsonb_build_object('team_id', tm.team_id, 'is_captain', tm.is_captain, 'revealed', tm.revealed, 'joined_at', tm.joined_at) end,
    'teams', app.team_board(ch.id),
    'weeks', (select coalesce(jsonb_agg(to_jsonb(w) order by w.week_no), '[]'::jsonb) from public.weeks w where w.challenge_id = ch.id),
    'ranks', (select coalesce(jsonb_agg(jsonb_build_object('name', r.name, 'min', r.min_points) order by r.min_points), '[]'::jsonb)
              from public.ranks r where r.challenge_id = ch.id),
    'categories', (select coalesce(jsonb_agg(to_jsonb(c) order by c.sort), '[]'::jsonb)
                   from public.point_categories c where c.challenge_id = ch.id and c.active),
    'missions', (select coalesce(jsonb_agg(jsonb_build_object(
                   'id', m.id, 'title', m.title, 'detail', m.detail, 'category_key', m.category_key,
                   'target', m.target_count, 'points', m.points_label,
                   'done', app.mission_count(v_uid, m, 'approved'), 'pending', app.mission_count(v_uid, m, 'pending')) order by m.sort), '[]'::jsonb)
                 from public.missions m
                 where m.challenge_id = ch.id and m.status = 'live' and not m.is_flash and m.week_no = v_wk),
    'flash', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', m.id, 'title', m.title, 'detail', m.detail, 'points', m.points_label, 'closes_at', m.closes_at,
                'done', app.mission_count(v_uid, m, 'approved') + app.mission_count(v_uid, m, 'pending')) order by m.closes_at), '[]'::jsonb)
              from public.missions m
              where m.challenge_id = ch.id and m.status = 'live' and m.is_flash and now() between m.opens_at and m.closes_at),
    'entries', (select coalesce(jsonb_agg(s.x order by s.created_at desc), '[]'::jsonb) from (
                  select e.created_at, jsonb_build_object('id', e.id, 'category_key', e.category_key, 'points', e.points,
                    'status', e.status, 'activity_date', e.activity_date, 'created_at', e.created_at,
                    'caption', e.caption, 'team_only', e.team_only, 'week_no', e.week_no) as x
                  from public.entries e where e.challenge_id = ch.id and e.user_id = v_uid
                  order by e.created_at desc limit 40) s),
    'points', (select coalesce(sum(e.points), 0) from public.entries e
               where e.challenge_id = ch.id and e.user_id = v_uid and e.status = 'approved' and not e.team_only),
    'pending_points', (select coalesce(sum(e.points), 0) from public.entries e
               where e.challenge_id = ch.id and e.user_id = v_uid and e.status = 'pending'),
    'signups', (select count(*) from public.team_members t where t.challenge_id = ch.id and not t.is_captain),
    'invite_code', (select i.code from public.invites i where i.challenge_id = ch.id and i.inviter_id = v_uid)
  );
end $$;

-- Round robin: the next person goes to the team with the fewest members.
create function app.join_challenge() returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  ch public.challenges%rowtype; pp public.profile_private%rowtype; p public.profiles%rowtype;
  v_team smallint; v_captain boolean := false;
begin
  perform app.ensure_profile();
  select * into ch from public.challenges where is_active limit 1;
  select * into pp from public.profile_private where id = v_uid;
  select * into p from public.profiles where id = v_uid;
  if not pp.verified then raise exception 'A coach needs to confirm your membership first.'; end if;
  if not p.adult_confirmed then raise exception 'Rally Point is for members 18 and older.'; end if;
  if p.show_on_tv is null then raise exception 'Choose whether your name and photo can show on the gym TV.'; end if;

  perform pg_advisory_xact_lock(74201, ch.id);
  select team_id into v_team from public.team_members where challenge_id = ch.id and user_id = v_uid;
  if v_team is null then
    if pp.role in ('coach','admin') and pp.coach_team is not null then
      select t.id into v_team from public.teams t where t.challenge_id = ch.id and t.name = pp.coach_team;
      v_captain := v_team is not null;
    end if;
    if v_team is null then
      select t.id into v_team from public.teams t
      where t.challenge_id = ch.id
      order by (select count(*) from public.team_members m where m.team_id = t.id and not m.is_captain), t.sort
      limit 1;
    end if;
    insert into public.team_members (challenge_id, user_id, team_id, is_captain) values (ch.id, v_uid, v_team, v_captain);
  end if;
  perform app.award_auto(v_uid, ch.id);
  return jsonb_build_object('team_id', v_team, 'is_captain', v_captain);
end $$;

create function app.mark_revealed() returns void language sql security definer set search_path = '' as $$
  update public.team_members set revealed = true where user_id = (select auth.uid())
$$;

create function app.submit_entry(p_category text, p_date date, p_photo text, p_link text, p_caption text, p_mission bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  ch public.challenges%rowtype; tm public.team_members%rowtype; c public.point_categories%rowtype; m public.missions%rowtype;
  v_today date := app.today(); v_date date := coalesce(p_date, app.today());
  v_wk int; v_pts int; v_id bigint; v_dbl text;
begin
  if v_uid is null then raise exception 'Sign in first.'; end if;
  perform pg_advisory_xact_lock(74202, hashtext(v_uid::text));
  select * into ch from public.challenges where is_active limit 1;
  select * into tm from public.team_members where challenge_id = ch.id and user_id = v_uid;
  if not found then raise exception 'Join the challenge first.'; end if;
  select * into c from public.point_categories where challenge_id = ch.id and key = p_category and active;
  if not found or c.logged_by <> 'member' then raise exception 'That can’t be logged here.'; end if;
  if v_today > ch.ends_on then raise exception 'This challenge has ended.'; end if;
  if v_today < ch.starts_on or (v_today < ch.scoring_starts_on and not c.allowed_pre) then
    raise exception 'Scoring starts %.', to_char(ch.scoring_starts_on, 'FMMonth FMDD');
  end if;
  if v_date > v_today or v_date < v_today - 1 then raise exception 'You can log today or yesterday.'; end if;
  if v_date < ch.starts_on or (v_date < ch.scoring_starts_on and not c.allowed_pre) then
    raise exception 'That day was before scoring started.';
  end if;
  v_wk := app.week_no(ch.id, v_date);

  if p_photo is not null and p_photo not like v_uid::text || '/%' then raise exception 'That photo didn’t upload correctly. Try again.'; end if;
  if p_link is not null and (p_link !~* '^https?://' or char_length(p_link) > 500) then raise exception 'That link doesn’t look right.'; end if;
  if c.proof = 'photo' and p_photo is null then raise exception 'Add a photo.'; end if;
  if c.proof = 'link_or_photo' and p_photo is null and p_link is null then raise exception 'Add a link or a photo.'; end if;
  if c.key = 'guest' and coalesce(trim(p_caption), '') = '' then raise exception 'Add your guest’s name.'; end if;

  if c.per = 'day' and exists (select 1 from public.entries e where e.challenge_id = ch.id and e.user_id = v_uid
      and e.category_key = c.key and e.activity_date = v_date and e.status <> 'declined') then
    raise exception 'You already logged that for this day.';
  end if;
  if c.per = 'week' and exists (select 1 from public.entries e where e.challenge_id = ch.id and e.user_id = v_uid
      and e.category_key = c.key and e.week_no = v_wk and e.status <> 'declined') then
    raise exception 'You already logged that this week.';
  end if;
  if c.per = 'mission' then
    select * into m from public.missions
    where id = p_mission and challenge_id = ch.id and is_flash and status = 'live' and now() between opens_at and closes_at;
    if not found then raise exception 'That flash mission has closed.'; end if;
    if exists (select 1 from public.entries e where e.user_id = v_uid and e.mission_id = m.id and e.status <> 'declined') then
      raise exception 'You already logged this one.';
    end if;
  end if;
  if c.max_total is not null and (select count(*) from public.entries e where e.challenge_id = ch.id and e.user_id = v_uid
      and e.category_key = c.key and e.status <> 'declined') >= c.max_total then
    raise exception 'You’ve hit the limit for that one.';
  end if;

  select w.double_category into v_dbl from public.weeks w where w.challenge_id = ch.id and w.week_no = v_wk;
  v_pts := coalesce(case when c.per = 'mission' then nullif(m.points_label, 0) end, c.points)
           * case when v_dbl = c.key then 2 else 1 end;

  insert into public.entries (challenge_id, user_id, team_id, category_key, mission_id, week_no, activity_date, points,
                              team_only, status, source, photo_path, link_url, caption)
  values (ch.id, v_uid, tm.team_id, c.key, case when c.per = 'mission' then m.id end, v_wk, v_date, v_pts,
          c.team_only, 'approved', 'member', p_photo, p_link, nullif(trim(left(coalesce(p_caption, ''), 200)), ''))
  returning id into v_id;
  -- No approval step: what a member logs counts right away. A coach can take it back with review_entry.
  return jsonb_build_object('id', v_id, 'points', v_pts, 'status', 'approved');
end $$;

create function app.my_invite() returns text language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_ch smallint; v_code text;
begin
  if not app.is_verified() then raise exception 'Finish signing up first.'; end if;
  select id into v_ch from public.challenges where is_active limit 1;
  select code into v_code from public.invites where challenge_id = v_ch and inviter_id = v_uid;
  if v_code is null then
    v_code := substr(md5(random()::text || v_uid::text || clock_timestamp()::text), 1, 8);
    insert into public.invites (code, challenge_id, inviter_id) values (v_code, v_ch, v_uid);
  end if;
  return v_code;
end $$;

-- Public: what a guest sees when they open a member's invite link.
create function app.invite_info(p_code text) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'first_name', coalesce(x.first_name, split_part(p.display_name, ' ', 1)),
    'photo', p.photo_path,
    'challenge', ch.name)
  from public.invites i
  join public.challenges ch on ch.id = i.challenge_id
  join public.profiles p on p.id = i.inviter_id
  join public.profile_private x on x.id = i.inviter_id
  where i.code = p_code
$$;
create function app.invite_click(p_code text) returns void language sql security definer set search_path = '' as $$
  update public.invites set clicks = clicks + 1 where code = p_code
$$;

-- Birthdays and gym anniversaries for the current Monday to Sunday week.
-- First names only (a last initial is added only when two people in the same
-- list share a first name). Never ages. Days are returned to coaches only.
-- Anniversaries skip anyone whose Wodify start date is before April 2023: that
-- is when the gym moved onto Wodify, so those dates are not real start dates.
create function app.shoutouts(p_days boolean) returns jsonb language sql stable security definer set search_path = '' as $$
  with w as (
    select date_trunc('week', app.today()::timestamp)::date as d0,
           date_trunc('week', app.today()::timestamp)::date + 6 as d1
  ),
  r as (
    select x.first_name, x.last_name, x.next_birthday, x.member_since
    from app.roster x
    where x.active and not x.skip_shoutouts and coalesce(trim(x.first_name), '') <> ''
  ),
  b as (
    select r.first_name, r.last_name, v.d
    from r cross join w
    cross join lateral (values (r.next_birthday), ((r.next_birthday - interval '1 year')::date)) v(d)
    where v.d between w.d0 and w.d1
  ),
  a as (
    select r.first_name, r.last_name, v.d, v.n
    from r cross join w
    cross join lateral (
      select (r.member_since + make_interval(years => k.n))::date as d, k.n
      from (select distinct q.n from (values
              (extract(year from w.d0)::int - extract(year from r.member_since)::int),
              (extract(year from w.d1)::int - extract(year from r.member_since)::int)) q(n)) k
    ) v
    where r.member_since >= date '2023-04-01' and v.n >= 1 and v.d between w.d0 and w.d1
  )
  select jsonb_build_object(
    'from', (select d0 from w), 'to', (select d1 from w),
    'birthdays', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('name', s.nm, 'day', case when p_days then s.d end))
        order by case when p_days then s.d end, s.nm), '[]'::jsonb)
      from (select b.d, b.first_name || case when count(*) over (partition by lower(b.first_name)) > 1 and coalesce(b.last_name, '') <> ''
                     then ' ' || left(b.last_name, 1) || '.' else '' end as nm from b) s),
    'anniversaries', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('name', s.nm, 'years', s.n, 'day', case when p_days then s.d end))
        order by case when p_days then s.d end, s.nm), '[]'::jsonb)
      from (select a.d, a.n, a.first_name || case when count(*) over (partition by lower(a.first_name)) > 1 and coalesce(a.last_name, '') <> ''
                     then ' ' || left(a.last_name, 1) || '.' else '' end as nm from a) s)
  )
$$;

-- Members with no check-in for 10 days or more, for the coach view.
-- A captain gets their own team. The admin also gets members who have not
-- joined a team yet. A phone number is returned only when the member has not
-- opted out of texts in Wodify. Last check-in comes from the daily sync.
create function app.check_ins(p_ch smallint, p_team smallint, p_admin boolean) returns jsonb
language sql stable security definer set search_path = '' as $$
  with lim as (select app.today() as today, 10 as days),
  ro as (
    select r.wodify_client_id as id, r.first_name, r.last_name, r.last_class_date as last,
           case when r.sms_status = 'Subscribed' then
             case when length(d.digits) = 10 then '+1' || d.digits
                  when length(d.digits) = 11 and left(d.digits, 1) = '1' then '+' || d.digits end
           end as phone
    from app.roster r
    cross join lim
    cross join lateral (select regexp_replace(coalesce(r.phone, ''), '\D', '', 'g') as digits) d
    where r.active and r.role = 'member'
      and (r.last_class_date <= lim.today - lim.days
           or (r.last_class_date is null and coalesce(r.member_since, date '2000-01-01') <= lim.today - lim.days))
  ),
  team as (
    select ro.id, coalesce(nullif(concat_ws(' ', x.first_name, x.last_name), ''), p.display_name) as name,
           coalesce(nullif(x.first_name, ''), split_part(p.display_name, ' ', 1)) as first, ro.last, ro.phone
    from public.team_members t
    join public.profiles p on p.id = t.user_id
    join public.profile_private x on x.id = t.user_id
    join ro on ro.id = x.wodify_client_id
    where p_team is not null and t.challenge_id = p_ch and t.team_id = p_team and not t.is_captain
  ),
  loose as (
    select ro.id, concat_ws(' ', ro.first_name, ro.last_name) as name, ro.first_name as first, ro.last, ro.phone
    from ro
    where p_admin and not exists (
      select 1 from public.profile_private x
      join public.team_members t on t.user_id = x.id and t.challenge_id = p_ch
      where x.wodify_client_id = ro.id)
  )
  select jsonb_build_object(
    'days', (select days from lim),
    'as_of', (select max(r.last_class_date) from app.roster r),
    'team', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'first', t.first, 'last', t.last, 'phone', t.phone)
               order by t.last desc nulls last, t.name), '[]'::jsonb) from team t),
    'loose', case when p_admin then (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'first', l.first, 'last', l.last, 'phone', l.phone)
               order by l.last desc nulls last, l.name), '[]'::jsonb) from loose l) end
  )
$$;

create function app.leaderboard() returns jsonb language plpgsql security definer set search_path = '' as $$
declare ch public.challenges%rowtype; v_wk int;
begin
  if not app.is_verified() then raise exception 'Members only.'; end if;
  select * into ch from public.challenges where is_active limit 1;
  perform app.sweep(ch.id);
  v_wk := app.week_no(ch.id, app.today());
  return jsonb_build_object(
    'teams', app.team_board(ch.id),
    'people', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.user_id, 'name', p.display_name, 'photo', p.photo_path, 'why', p.why_i_train, 'team_id', t.team_id,
        'points', coalesce(s.pts, 0), 'week_points', coalesce(s.wk, 0)) order by coalesce(s.pts, 0) desc, p.display_name), '[]'::jsonb)
      from public.team_members t
      join public.profiles p on p.id = t.user_id
      left join (select e.user_id, sum(e.points) filter (where not e.team_only) as pts,
                        sum(e.points) filter (where not e.team_only and e.week_no = v_wk) as wk
                 from public.entries e where e.challenge_id = ch.id and e.status = 'approved' group by e.user_id) s on s.user_id = t.user_id
      where t.challenge_id = ch.id and not t.is_captain));
end $$;

-- Public: everything the gym TV shows. Names and photos only for members who said yes.
-- Birthday and anniversary shoutouts are first names only, with no dates and no ages.
create function app.tv_snapshot() returns jsonb language plpgsql security definer set search_path = '' as $$
declare ch public.challenges%rowtype; v_today date := app.today(); v_wk int;
begin
  select * into ch from public.challenges where is_active limit 1;
  if not found then return '{}'::jsonb; end if;
  perform app.sweep(ch.id);
  v_wk := coalesce(app.week_no(ch.id, v_today), 0);
  return jsonb_build_object(
    'challenge', to_jsonb(ch), 'today', v_today, 'week_no', v_wk,
    'phase', case when v_today < ch.scoring_starts_on then 'pre' when v_today > ch.ends_on then 'done' else 'live' end,
    'weeks', (select coalesce(jsonb_agg(to_jsonb(w) order by w.week_no), '[]'::jsonb) from public.weeks w where w.challenge_id = ch.id),
    'teams', app.team_board(ch.id),
    'signups', (select count(*) from public.team_members t where t.challenge_id = ch.id and not t.is_captain),
    'people', (select coalesce(jsonb_agg(q.x order by q.pts desc, q.nm), '[]'::jsonb) from (
        select coalesce(s.pts, 0) as pts, p.display_name as nm, jsonb_build_object('name', p.display_name, 'photo', p.photo_path,
                 'team_id', t.team_id, 'points', coalesce(s.pts, 0), 'week_points', coalesce(s.wk, 0)) as x
        from public.team_members t
        join public.profiles p on p.id = t.user_id and p.show_on_tv
        left join (select e.user_id, sum(e.points) filter (where not e.team_only) as pts,
                          sum(e.points) filter (where not e.team_only and e.week_no = v_wk) as wk
                   from public.entries e where e.challenge_id = ch.id and e.status = 'approved' group by e.user_id) s on s.user_id = t.user_id
        where t.challenge_id = ch.id and not t.is_captain
        order by coalesce(s.pts, 0) desc, p.display_name limit 12) q),
    'highlights', (select coalesce(jsonb_agg(h.x), '[]'::jsonb) from (
        select jsonb_build_object('name', p.display_name, 'photo', p.photo_path, 'why', p.why_i_train, 'team_id', t.team_id) as x
        from public.team_members t join public.profiles p on p.id = t.user_id
        where t.challenge_id = ch.id and not t.is_captain and p.show_on_tv and p.photo_path is not null
          and coalesce(trim(p.why_i_train), '') <> ''
        order by md5(p.id::text || v_today::text) limit 6) h),
    -- Photos sent with a log entry are for coaches only. They never go on the gym screen.
    'photos', '[]'::jsonb,
    'shoutouts', app.shoutouts(false),
    'ticker', (select coalesce(jsonb_agg(k.x), '[]'::jsonb) from (
        select jsonb_build_object('name', case when p.show_on_tv then p.display_name else 'A teammate' end,
                 'label', c.label, 'points', e.points, 'team_id', e.team_id) as x
        from public.entries e
        join public.profiles p on p.id = e.user_id
        join public.point_categories c on c.challenge_id = e.challenge_id and c.key = e.category_key
        where e.challenge_id = ch.id and e.status = 'approved' and not e.team_only and e.source <> 'auto'
        order by coalesce(e.reviewed_at, e.created_at) desc limit 12) k)
  );
end $$;

-- Public: the week ahead (today and the six days after it), published days only.
-- Shown in the app and on a member's invite page so they can share it with a friend.
create function app.workout_preview() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('date', w.workout_date, 'parts', w.parts) order by w.workout_date), '[]'::jsonb)
  from app.workouts w
  where w.published and w.workout_date between app.today() and app.today() + 6
$$;

create function app.delete_my_account() returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in first.'; end if;
  delete from auth.users where id = v_uid;
end $$;

-- ------------------------------------------------------------------
-- Coach functions
-- ------------------------------------------------------------------
create function app.coach_home() returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); ch public.challenges%rowtype; pp public.profile_private%rowtype; v_team smallint; v_cap boolean;
begin
  perform app.ensure_profile();
  if not app.is_coach() then raise exception 'Coaches only.'; end if;
  select * into ch from public.challenges where is_active limit 1;
  select * into pp from public.profile_private where id = v_uid;
  perform app.sweep(ch.id);
  select team_id, is_captain into v_team, v_cap from public.team_members where challenge_id = ch.id and user_id = v_uid;
  return jsonb_build_object(
    'me', jsonb_build_object('role', pp.role, 'team_id', v_team, 'first_name', pp.first_name),
    -- Only a team captain sees who on their team has gone quiet, and their phone numbers.
    'check_in', app.check_ins(ch.id, case when coalesce(v_cap, false) then v_team end, pp.role = 'admin'),
    'shoutouts', app.shoutouts(true),
    'challenge', to_jsonb(ch), 'today', app.today(),
    'teams', app.team_board(ch.id),
    'queue', (select coalesce(jsonb_agg(s.x order by s.created_at desc), '[]'::jsonb) from (
        select e.created_at, jsonb_build_object('id', e.id, 'name', p.display_name, 'avatar', p.photo_path, 'team_id', e.team_id,
          'category_key', e.category_key, 'points', e.points, 'photo_path', e.photo_path, 'link_url', e.link_url,
          'caption', e.caption, 'activity_date', e.activity_date, 'created_at', e.created_at,
          'status', e.status, 'auto_approved', e.auto_approved) as x
        from public.entries e join public.profiles p on p.id = e.user_id
        where e.challenge_id = ch.id and e.source = 'member' and e.status <> 'declined'
          and e.created_at > now() - interval '14 days'
          and (pp.role = 'admin' or e.team_id = v_team)
        order by e.created_at desc limit 60) s),
    'pending_people', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'email', x.email, 'name', p.display_name,
          'created_at', x.created_at) order by x.created_at), '[]'::jsonb)
        from public.profile_private x join public.profiles p on p.id = x.id where not x.verified),
    'members', (select coalesce(jsonb_agg(jsonb_build_object('id', t.user_id, 'name', p.display_name,
          'full', nullif(concat_ws(' ', x.first_name, x.last_name), ''), 'team_id', t.team_id) order by p.display_name), '[]'::jsonb)
        from public.team_members t join public.profiles p on p.id = t.user_id join public.profile_private x on x.id = t.user_id
        where t.challenge_id = ch.id and not t.is_captain),
    'roster_unlinked', (select coalesce(jsonb_agg(jsonb_build_object('email', r.email,
          'name', concat_ws(' ', r.first_name, r.last_name)) order by r.first_name, r.last_name), '[]'::jsonb)
        from app.roster r where r.active and r.role = 'member'
          and not exists (select 1 from public.profile_private x where x.wodify_client_id = r.wodify_client_id)),
    'categories', (select coalesce(jsonb_agg(to_jsonb(c) order by c.sort), '[]'::jsonb) from public.point_categories c
        where c.challenge_id = ch.id and c.active and c.logged_by in ('coach', 'member') and c.per <> 'mission'),
    'labels', (select coalesce(jsonb_object_agg(c.key, c.label), '{}'::jsonb) from public.point_categories c where c.challenge_id = ch.id),
    'flash', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'closes_at', m.closes_at,
          'open', now() between m.opens_at and m.closes_at) order by m.closes_at desc), '[]'::jsonb)
        from public.missions m where m.challenge_id = ch.id and m.is_flash),
    'signups', (select count(*) from public.team_members t where t.challenge_id = ch.id and not t.is_captain),
    'roster_count', (select count(*) from app.roster r where r.active and r.role = 'member')
  );
end $$;

create function app.review_entry(p_id bigint, p_approve boolean) returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); e public.entries%rowtype; v_team smallint;
begin
  if not app.is_coach() then raise exception 'Coaches only.'; end if;
  select * into e from public.entries where id = p_id for update;
  if not found or e.source <> 'member' then raise exception 'That entry isn’t there anymore.'; end if;
  select team_id into v_team from public.team_members where challenge_id = e.challenge_id and user_id = v_uid;
  if not app.is_admin() and (v_team is null or v_team <> e.team_id) then raise exception 'That one belongs to another team.'; end if;
  update public.entries set status = case when p_approve then 'approved' else 'declined' end,
    reviewed_by = v_uid, reviewed_at = now(), auto_approved = false
  where id = p_id;
end $$;

create function app.coach_log(p_user uuid, p_category text, p_note text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); ch public.challenges%rowtype; tm public.team_members%rowtype; c public.point_categories%rowtype;
  v_today date := app.today(); v_id bigint;
begin
  if not app.is_coach() then raise exception 'Coaches only.'; end if;
  select * into ch from public.challenges where is_active limit 1;
  select * into tm from public.team_members where challenge_id = ch.id and user_id = p_user and not is_captain;
  if not found then raise exception 'That member hasn’t joined yet.'; end if;
  select * into c from public.point_categories where challenge_id = ch.id and key = p_category and active
    and logged_by in ('coach', 'member') and per <> 'mission';
  if not found then raise exception 'Coaches can’t log that one.'; end if;
  if c.per = 'day' and exists (select 1 from public.entries e where e.challenge_id = ch.id and e.user_id = p_user
      and e.category_key = c.key and e.activity_date = v_today and e.status <> 'declined') then
    raise exception 'They already have that for today.';
  end if;
  if c.per = 'week' and exists (select 1 from public.entries e where e.challenge_id = ch.id and e.user_id = p_user
      and e.category_key = c.key and e.week_no = app.week_no(ch.id, v_today) and e.status <> 'declined') then
    raise exception 'They already have that this week.';
  end if;
  if v_today < ch.starts_on or v_today > ch.ends_on or (v_today < ch.scoring_starts_on and not c.allowed_pre) then
    raise exception 'That isn’t open for points right now.';
  end if;
  if c.max_total is not null and (select count(*) from public.entries e where e.challenge_id = ch.id and e.user_id = p_user
      and e.category_key = c.key and e.status <> 'declined') >= c.max_total then
    raise exception 'They’ve hit the limit for that one.';
  end if;
  insert into public.entries (challenge_id, user_id, team_id, category_key, week_no, activity_date, points, team_only,
                              status, source, caption, reviewed_by, reviewed_at)
  values (ch.id, p_user, tm.team_id, c.key, app.week_no(ch.id, v_today), v_today, c.points, c.team_only,
          'approved', 'coach', nullif(trim(left(coalesce(p_note, ''), 200)), ''), v_uid, now())
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'points', c.points);
end $$;

create function app.verify_person(p_user uuid, p_roster_email text) returns void language plpgsql security definer set search_path = '' as $$
declare r app.roster%rowtype;
begin
  if not app.is_coach() then raise exception 'Coaches only.'; end if;
  if p_roster_email is not null then
    select * into r from app.roster where email = lower(p_roster_email);
  end if;
  update public.profile_private x set verified = true,
    first_name = coalesce(r.first_name, x.first_name), last_name = coalesce(r.last_name, x.last_name),
    wodify_client_id = coalesce(r.wodify_client_id, x.wodify_client_id)
  where x.id = p_user;
end $$;

create function app.move_member(p_user uuid, p_team smallint) returns void language plpgsql security definer set search_path = '' as $$
declare v_ch smallint;
begin
  if not app.is_coach() then raise exception 'Coaches only.'; end if;
  select id into v_ch from public.challenges where is_active limit 1;
  if not exists (select 1 from public.teams where id = p_team and challenge_id = v_ch) then raise exception 'No such team.'; end if;
  update public.team_members set team_id = p_team where challenge_id = v_ch and user_id = p_user and not is_captain;
  update public.entries set team_id = p_team where challenge_id = v_ch and user_id = p_user;
end $$;

create function app.create_flash(p_title text, p_detail text, p_hours int, p_points int) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_ch smallint; v_id bigint;
begin
  if not app.is_coach() then raise exception 'Coaches only.'; end if;
  select id into v_ch from public.challenges where is_active limit 1;
  insert into public.missions (challenge_id, week_no, title, detail, category_key, points_label, is_flash, opens_at, closes_at, status, created_by)
  values (v_ch, app.week_no(v_ch, app.today()), left(trim(p_title), 80), nullif(left(trim(coalesce(p_detail, '')), 200), ''),
          'flash', greatest(1, least(coalesce(p_points, 3), 10)), true, now(),
          now() + make_interval(hours => greatest(1, least(coalesce(p_hours, 48), 168))), 'live', auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- Service use (the daily Wodify pull): post class points and any bonuses they trigger, for everyone.
create function app.post_attendance() returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select tm.user_id, tm.challenge_id from public.team_members tm
           join public.challenges ch on ch.id = tm.challenge_id
           where ch.is_active loop
    perform app.award_auto(r.user_id, r.challenge_id);
  end loop;
end $$;

-- Storage: who can see a photo sent with a log entry. The member who sent it, and coaches.
create function app.can_view_proof(p_name text) returns boolean language sql stable security definer set search_path = '' as $$
  select split_part(p_name, '/', 1) = coalesce((select auth.uid())::text, '') or app.is_coach()
$$;

-- ------------------------------------------------------------------
-- Public wrappers (what the Data API exposes)
-- ------------------------------------------------------------------
create function public.bootstrap() returns jsonb language sql security invoker set search_path = '' as $$ select app.bootstrap() $$;
create function public.join_challenge() returns jsonb language sql security invoker set search_path = '' as $$ select app.join_challenge() $$;
create function public.mark_revealed() returns void language sql security invoker set search_path = '' as $$ select app.mark_revealed() $$;
create function public.submit_entry(p_category text, p_date date default null, p_photo text default null, p_link text default null, p_caption text default null, p_mission bigint default null)
  returns jsonb language sql security invoker set search_path = '' as $$ select app.submit_entry(p_category, p_date, p_photo, p_link, p_caption, p_mission) $$;
create function public.my_invite() returns text language sql security invoker set search_path = '' as $$ select app.my_invite() $$;
create function public.invite_info(p_code text) returns jsonb language sql security invoker set search_path = '' as $$ select app.invite_info(p_code) $$;
create function public.invite_click(p_code text) returns void language sql security invoker set search_path = '' as $$ select app.invite_click(p_code) $$;
create function public.leaderboard() returns jsonb language sql security invoker set search_path = '' as $$ select app.leaderboard() $$;
create function public.tv_snapshot() returns jsonb language sql security invoker set search_path = '' as $$ select app.tv_snapshot() $$;
create function public.workout_preview() returns jsonb language sql security invoker set search_path = '' as $$ select app.workout_preview() $$;
create function public.reserve_identity() returns jsonb language sql security invoker set search_path = '' as $$ select app.reserve_identity() $$;
create function public.delete_my_account() returns void language sql security invoker set search_path = '' as $$ select app.delete_my_account() $$;
create function public.coach_home() returns jsonb language sql security invoker set search_path = '' as $$ select app.coach_home() $$;
create function public.review_entry(p_id bigint, p_approve boolean) returns void language sql security invoker set search_path = '' as $$ select app.review_entry(p_id, p_approve) $$;
create function public.coach_log(p_user uuid, p_category text, p_note text default null) returns jsonb language sql security invoker set search_path = '' as $$ select app.coach_log(p_user, p_category, p_note) $$;
create function public.verify_person(p_user uuid, p_roster_email text default null) returns void language sql security invoker set search_path = '' as $$ select app.verify_person(p_user, p_roster_email) $$;
create function public.move_member(p_user uuid, p_team smallint) returns void language sql security invoker set search_path = '' as $$ select app.move_member(p_user, p_team) $$;
create function public.create_flash(p_title text, p_detail text default null, p_hours int default 48, p_points int default 3) returns bigint language sql security invoker set search_path = '' as $$ select app.create_flash(p_title, p_detail, p_hours, p_points) $$;

-- ------------------------------------------------------------------
-- Privileges: start from nothing, grant what each role needs.
-- ------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all tables in schema app from anon, authenticated;
revoke execute on all functions in schema app from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant select on public.challenges, public.teams, public.weeks, public.ranks, public.point_categories, public.missions,
  public.profiles, public.profile_private, public.team_members, public.entries, public.invites to authenticated;
grant update (display_name, photo_path, why_i_train, usual_class, show_on_tv, adult_confirmed) on public.profiles to authenticated;

grant execute on function
  app.today(), app.is_verified(), app.is_coach(), app.is_admin(), app.can_view_proof(text),
  app.bootstrap(), app.join_challenge(), app.mark_revealed(), app.submit_entry(text, date, text, text, text, bigint),
  app.my_invite(), app.invite_info(text), app.invite_click(text), app.leaderboard(), app.tv_snapshot(), app.delete_my_account(),
  app.coach_home(), app.review_entry(bigint, boolean), app.coach_log(uuid, text, text), app.verify_person(uuid, text),
  app.move_member(uuid, smallint), app.create_flash(text, text, int, int)
to authenticated;
grant execute on function app.can_view_proof(text), app.invite_info(text), app.invite_click(text), app.tv_snapshot() to anon;
grant execute on function app.workout_preview() to anon, authenticated;

grant execute on function
  public.bootstrap(), public.join_challenge(), public.mark_revealed(), public.submit_entry(text, date, text, text, text, bigint),
  public.my_invite(), public.invite_info(text), public.invite_click(text), public.leaderboard(), public.tv_snapshot(), public.delete_my_account(),
  public.coach_home(), public.review_entry(bigint, boolean), public.coach_log(uuid, text, text), public.verify_person(uuid, text),
  public.move_member(uuid, smallint), public.create_flash(text, text, int, int)
to authenticated;
grant execute on function public.invite_info(text), public.invite_click(text), public.tv_snapshot() to anon;
grant execute on function public.workout_preview() to anon, authenticated;
grant execute on function app.reserve_identity(), public.reserve_identity() to authenticated;

-- ------------------------------------------------------------------
-- Row level security
-- ------------------------------------------------------------------
alter table public.challenges enable row level security;
alter table public.teams enable row level security;
alter table public.weeks enable row level security;
alter table public.ranks enable row level security;
alter table public.point_categories enable row level security;
alter table public.missions enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.team_members enable row level security;
alter table public.entries enable row level security;
alter table public.invites enable row level security;

-- Reference data: any signed-in user can read it. Nothing personal lives here.
create policy "read challenges" on public.challenges for select to authenticated using (true);
create policy "read teams" on public.teams for select to authenticated using (true);
create policy "read weeks" on public.weeks for select to authenticated using (true);
create policy "read ranks" on public.ranks for select to authenticated using (true);
create policy "read categories" on public.point_categories for select to authenticated using (true);
create policy "read live missions" on public.missions for select to authenticated using (status = 'live');

-- Profiles: you always see your own; confirmed members see each other's display info.
create policy "read profiles" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select app.is_verified()));
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "read own private" on public.profile_private for select to authenticated
  using (id = (select auth.uid()) or (select app.is_coach()));

create policy "read team members" on public.team_members for select to authenticated
  using (user_id = (select auth.uid()) or (select app.is_verified()));

create policy "read own entries" on public.entries for select to authenticated
  using (user_id = (select auth.uid()) or (select app.is_coach()));

create policy "read own invite" on public.invites for select to authenticated
  using (inviter_id = (select auth.uid()));

-- ------------------------------------------------------------------
-- Storage
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 3145728, array['image/jpeg','image/png','image/webp']),
  ('proof', 'proof', false, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "avatars: add own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: see own" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: remove own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "proof: add own" on storage.objects for insert to authenticated
  with check (bucket_id = 'proof' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "proof: remove own" on storage.objects for delete to authenticated
  using (bucket_id = 'proof' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "proof: view" on storage.objects for select to anon, authenticated
  using (bucket_id = 'proof' and (select app.can_view_proof(name)));
