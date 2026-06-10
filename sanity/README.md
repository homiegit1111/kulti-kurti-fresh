# Sanity CMS — Lookbook / Editorial

The storefront reads editorial content via a tiny, dependency-free GROQ client
(`src/lib/sanity/client.ts`). This folder holds the **Studio** schema so you can
stand up a Sanity project that the site reads from.

## 1. Create the Studio

```bash
npm create sanity@latest -- --template clean --create-project "Rangat Pehnawa" --dataset production
```

Add the schema:

```ts
// sanity.config.ts (in the Studio project)
import { editorial } from "../Kurti/sanity/schemas/editorial"; // or copy it in
export default defineConfig({
  // ...
  schema: { types: [editorial] },
});
```

## 2. Connect the storefront

Fill these in `.env.local` (see `.env.example`):

```
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-10-01
# Only for private datasets / draft previews:
SANITY_API_READ_TOKEN=
```

In Sanity → API → CORS origins, add your site origin. For public read access
keep the dataset public (no token needed); the client uses the cached CDN host.

## 3. How it renders

- `/lookbook` lists `editorial` documents (newest first).
- Until Sanity is configured (or if a fetch fails), the page falls back to
  built-in editorial cards, so the route is never broken.
- Field names in `schemas/editorial.ts` must match the GROQ in
  `src/lib/sanity/queries.ts`.

## Notes

- `body` is Portable Text. To render it richly, add `@portabletext/react`
  and map blocks; the current scaffold renders title/excerpt/cover.
- Images use Sanity's image CDN via `sanityImageUrl()` (no `@sanity/image-url`
  dependency needed for simple width/auto-format URLs).
