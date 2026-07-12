create index blog_posts_author_id_idx on public.blog_posts (author_id);

drop policy "Published posts are public" on public.blog_posts;
drop policy "Blog admins can read every post" on public.blog_posts;

create policy "Published posts are public"
  on public.blog_posts
  for select
  to anon
  using (status = 'published' and published_at <= now());

create policy "Authenticated readers see published posts and admins see all"
  on public.blog_posts
  for select
  to authenticated
  using (
    (status = 'published' and published_at <= now())
    or (select private.is_blog_admin())
  );
