alter table public.profiles
  add column if not exists career_path text not null default 'grow'
    check (career_path in ('launch','grow','revive','relaunch')),
  add column if not exists career_goal text,
  add column if not exists career_story text,
  add column if not exists kora_link_status text not null default 'not_linked'
    check (kora_link_status in ('not_linked','pending','linked','blocked')),
  add column if not exists kora_creator_reference text,
  add column if not exists has_video_catalogue boolean not null default false,
  add column if not exists touring_artist boolean not null default false;

comment on column public.profiles.career_path is 'Creator-selected ALLEGRO career pathway: launch, grow, revive or relaunch.';
comment on column public.profiles.kora_creator_reference is 'Server-approved reference used to link the ALLEGRO creator identity to KORA.';
