create schema if not exists private;

create table public.blog_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 180),
  excerpt text not null default '' check (char_length(excerpt) <= 360),
  content_html text not null default '',
  thumbnail_url text,
  thumbnail_path text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_posts_have_a_date check (status = 'draft' or published_at is not null)
);

create index blog_posts_public_feed_idx
  on public.blog_posts (published_at desc)
  where status = 'published';

alter table public.blog_admins enable row level security;
alter table public.blog_posts enable row level security;

create or replace function private.is_blog_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.blog_admins
      where user_id = (select auth.uid())
    );
$$;

revoke all on function private.is_blog_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_blog_admin() to authenticated;

revoke all on public.blog_admins from anon, authenticated;
grant select on public.blog_admins to authenticated;
grant select on public.blog_posts to anon;
grant select, insert, update, delete on public.blog_posts to authenticated;

create policy "Users can verify their own blog admin membership"
  on public.blog_admins
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Published posts are public"
  on public.blog_posts
  for select
  to anon, authenticated
  using (status = 'published' and published_at <= now());

create policy "Blog admins can read every post"
  on public.blog_posts
  for select
  to authenticated
  using ((select private.is_blog_admin()));

create policy "Blog admins can create posts"
  on public.blog_posts
  for insert
  to authenticated
  with check (
    (select private.is_blog_admin())
    and author_id = (select auth.uid())
  );

create policy "Blog admins can update posts"
  on public.blog_posts
  for update
  to authenticated
  using ((select private.is_blog_admin()))
  with check ((select private.is_blog_admin()));

create policy "Blog admins can delete posts"
  on public.blog_posts
  for delete
  to authenticated
  using ((select private.is_blog_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-media',
  'blog-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Blog admins can list blog media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'blog-media'
    and (select private.is_blog_admin())
  );

create policy "Blog admins can upload blog media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'blog-media'
    and (select private.is_blog_admin())
  );

create policy "Blog admins can update blog media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'blog-media'
    and (select private.is_blog_admin())
  )
  with check (
    bucket_id = 'blog-media'
    and (select private.is_blog_admin())
  );

create policy "Blog admins can delete blog media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'blog-media'
    and (select private.is_blog_admin())
  );
