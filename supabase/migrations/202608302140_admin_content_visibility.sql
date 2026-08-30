-- Moderators must see reported/blocked content to judge it.

drop policy "posts_select" on public.posts;
create policy "posts_select" on public.posts
  for select using (
    (moderation <> 'blocked' or author_id = auth.uid() or public.is_admin())
    and (
      author_id = auth.uid()
      or public.is_admin()
      or (
        visibility = 'community'
        and (group_id is null or public.group_readable(group_id))
      )
    )
  );

drop policy "post_comments_select" on public.post_comments;
create policy "post_comments_select" on public.post_comments
  for select using (
    (moderation <> 'blocked' or author_id = auth.uid() or public.is_admin())
    and exists (select 1 from public.posts p where p.id = post_id)
  );
