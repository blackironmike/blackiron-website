-- Rally Point: the first challenge. Values come from the "Rally Point Challenge
-- Setup" sheet. Safe to re-run: every insert skips rows that already exist.

-- Scoring starts with the launch (Coach Mike, Nov 22). The early sign-up points
-- (Rally Point Original, team sign-up bonus) keep a Nov 30 cutoff.
insert into public.challenges (slug, name, starts_on, scoring_starts_on, ends_on, is_active, early_signup_until)
values ('rally-point', 'Rally Point', '2026-11-23', '2026-11-23', '2027-01-17', true, '2026-11-30')
on conflict (slug) do nothing;

insert into public.teams (challenge_id, name, captain_name, captain_photo, sort)
select ch.id, v.name, v.captain, v.photo, v.sort
from public.challenges ch,
  (values
    ('Team Mike', 'Coach Mike', '/images/team/owner-headcoach-mike.webp', 1),
    ('Team Kristin', 'Coach Kristin', '/images/team/general-manager-caoch-kristin.webp', 2),
    ('Team Emily', 'Coach Emily', '/images/team/coach-emily.webp', 3),
    ('Team Lawrence', 'Coach Lawrence', '/images/team/coach-lawrence.webp', 4),
    ('Team Evan', 'Coach Evan', '/images/team/coach-evan.webp', 5),
    ('Team Aileen', 'Coach Aileen', '/images/team/coach-aileen.webp', 6)
  ) as v(name, captain, photo, sort)
where ch.slug = 'rally-point'
  and not exists (select 1 from public.teams t where t.challenge_id = ch.id and t.name = v.name);

insert into public.weeks (challenge_id, week_no, starts_on, focus, double_category)
select ch.id, v.week_no, v.starts_on::date, v.focus, v.dbl
from public.challenges ch,
  (values
    (1, '2026-11-23', 'Kickoff and Friends & Family Week. Scoring starts.', null),
    (2, '2026-11-30', null, null),
    (3, '2026-12-07', 'Toy drop run Sat Dec 12.', null),
    (4, '2026-12-14', 'Awards night.', null),
    (5, '2026-12-21', 'Travel week.', 'active'),
    (6, '2026-12-28', 'Last WOD of 2026, first WOD of 2027.', null),
    (7, '2027-01-04', null, null),
    (8, '2027-01-11', 'Finale week. Champions crowned.', null)
  ) as v(week_no, starts_on, focus, dbl)
where ch.slug = 'rally-point'
on conflict (challenge_id, week_no) do nothing;

insert into public.ranks (challenge_id, name, min_points)
select ch.id, v.name, v.min_points
from public.challenges ch,
  (values ('Recruit', 0), ('Private', 15), ('Corporal', 40), ('Sergeant', 75), ('Staff Sergeant', 110), ('Gunnery Sergeant', 150)) as v(name, min_points)
where ch.slug = 'rally-point'
on conflict (challenge_id, min_points) do nothing;

insert into public.point_categories (challenge_id, key, label, hint, points, logged_by, proof, per, max_total, team_only, allowed_pre, sort)
select ch.id, v.key, v.label, v.hint, v.points, v.logged_by, v.proof, v.per, v.max_total, v.team_only, v.allowed_pre, v.sort
from public.challenges ch,
  (values
    ('class',       'Class attended',          'Counts on its own from your check-in.',                       2, 'auto',   'none',          'day',     null::int, false, false, 1),
    ('open_gym',    'Open Gym',                'Counts on its own from your check-in. A class the same day counts instead.', 1, 'auto', 'none', 'day', null, false, false, 2),
    ('social',      'Weekly social challenge', 'Post it, tag @blackiron_athletics, add #BlackIron2027. Then drop the link or a screenshot here.', 3, 'member', 'link_or_photo', 'week', null, false, false, 2),
    ('active',      'Active anywhere',         'Home workout, run, walk, hike, ride, travel gym. Snap a photo.', 2, 'member', 'photo',         'day',     null,      false, false, 3),
    ('guest',       'Brought a guest',         'Tell us who you brought. Your invite link gets them set up before class.',  5, 'member', 'none',          'any',     null,      false, true,  4),
    ('toy',         'Toy drop',                'Toys for Tots. Snap a photo of your toy at the drop box.', 10, 'member', 'photo',     'any',     5,         false, true,  5),
    ('in_class',    'In-class challenge',      'This week’s challenge from Coach Mike. Log it once you’ve done it.', 3, 'member', 'none',          'week',    null,      false, false, 6),
    ('flash',       'Flash mission',           'Surprise missions with a short clock.',                       3, 'member', 'photo',         'mission', null,      false, false, 7),
    ('clean_sweep', 'Clean Sweep',             'Finish every mission in a week.',                             5, 'auto',   'none',          'week',    null,      false, false, 8),
    ('profile',     'Profile complete',        'Your photo and why you train.',                               2, 'auto',   'none',          'once',    null,      false, false, 9),
    ('original',    'Rally Point Original',    'Signed up before November 30.',                               3, 'auto',   'none',          'once',    null,      false, false, 10),
    ('team_signup', 'Team sign-up bonus',      'One point to your team for signing up before November 30.',   1, 'auto',   'none',          'once',    null,      true,  false, 11),
    ('mission_bonus', 'Mission bonus',         'Hit a weekly target, like three classes in a week.',          3, 'auto',   'none',          'any',     null,      false, false, 12)
  ) as v(key, label, hint, points, logged_by, proof, per, max_total, team_only, allowed_pre, sort)
where ch.slug = 'rally-point'
on conflict (challenge_id, key) do nothing;

-- Week 1 and Week 2 missions (the same set until Coach Mike changes Week 2).
-- points_label is what the row shows; the points themselves come from the
-- category each time something is logged. bonus_points lands once when the
-- member hits the target (3 classes: 2 each, plus 3).
insert into public.missions (challenge_id, week_no, sort, title, category_key, target_count, points_label, bonus_points, status)
select ch.id, wk.n, v.sort, v.title, v.category_key, v.target_count, v.points_label, v.bonus_points, 'live'
from public.challenges ch, (values (1), (2)) as wk(n),
  (values
    (1, 'Show up 3 times', 'class', 3, 3, 3),
    (2, 'Social challenge: throwback to your first day at BIA', 'social', 1, 3, 0),
    (3, 'Finish your profile: photo and why I train', 'profile', 1, 2, 0),
    (4, 'Bring a guest', 'guest', 1, 5, 0),
    (5, 'Toy drop', 'toy', 1, 10, 0),
    (6, 'In-class challenge (Coach Mike picks it)', 'in_class', 1, 3, 0)
  ) as v(sort, title, category_key, target_count, points_label, bonus_points)
where ch.slug = 'rally-point'
  and not exists (select 1 from public.missions m where m.challenge_id = ch.id and m.week_no = wk.n and m.title = v.title);
