# Blog and newsletter setup

The database and storage migration is in `supabase/migrations/20260712000000_create_blog.sql` and targets the existing `alpha_flow_server` Supabase project.

## Add an administrator

1. In the Supabase dashboard, open **Authentication → Users → Add user** and create the editor's email/password account.
2. Copy that user's UUID.
3. Run this in the SQL editor, replacing the placeholder:

```sql
insert into public.blog_admins (user_id)
values ('USER_UUID_HERE');
```

The `/admin/` page intentionally has no public sign-up. A valid Supabase login that is not present in `blog_admins` can authenticate, but cannot read drafts, write posts, or upload media.

## Routes

- `/`: latest published posts appear in the **Newsletter** section.
- `/articles/your-post-slug`: server-rendered public article reader.
- `/sitemap.xml`: dynamic index of every published article for search crawlers.
- `/llms.txt`: concise AI-readable index of the publication and its canonical articles.
- `/admin/`: authenticated post manager and editor.

DOCX import keeps common Word formatting and uploads embedded JPEG/PNG/WebP/GIF images to the `blog-media` bucket. Before conversion, it warns editors about native Word charts, SmartArt, embedded Excel/OLE objects, and unsupported EMF/WMF/SVG graphics so they can replace those items with high-resolution PNG images. Imported and edited HTML is sanitized before it is saved and again before it is rendered publicly.
