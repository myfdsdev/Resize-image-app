# PixForge

Bulk image resizer for every platform. Resize, convert and compress images for Instagram, YouTube, Facebook, Google Ads and more. All image processing happens **in the browser**: photos are never uploaded.

## Features (Phase 1)

- Drag & drop bulk upload (JPG, PNG, WebP), with validation and clear reasons for skipped files
- Thumbnail grid with select, remove and clear all
- Resize modes: keep ratio (fit inside), fill & crop, fit & pad, stretch
- 34 platform presets. Select several and every image is exported in every size, one ZIP folder per size.
- Convert to JPG / PNG / WebP (WebP is disabled automatically if the browser cannot encode it)
- Quality control and size comparison (before → after)
- Transparent images get a background color when exported as JPG, so they never turn black
- Batch processing in Web Workers (2 at a time); one failed image never stops the batch, plus Retry
- Single download or ZIP export
- Accounts with email + password (and optional Google) stored in MongoDB
- Dark theme with white buttons, mobile-friendly with a bottom action bar

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Zustand · JSZip · Auth.js v5 · MongoDB

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `AUTH_SECRET` | for login | Random secret. Generate with `npx auth secret` |
| `MONGODB_URI` | for login | MongoDB Atlas connection string |
| `MONGODB_DB` | no | Database name (default `pixforge`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | no | Enables "Continue with Google" |
| `NEXT_PUBLIC_SITE_URL` | no | Public site URL for SEO |
| `NEXT_PUBLIC_MAX_FILES` | no | Max images per batch (default 100) |
| `NEXT_PUBLIC_MAX_FILE_SIZE_MB` | no | Max size per image (default 25) |

All image tools work without any variables. Only login needs `AUTH_SECRET` and `MONGODB_URI`.

### Local database for development

If you do not have MongoDB Atlas yet, run a throw-away local database:

```bash
npm run db:local
```

Then set `MONGODB_URI=mongodb://127.0.0.1:27018/` in `.env.local`. Data is lost when it stops.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run db:local` | Local test MongoDB |

## Project structure

```
src/
  app/                 pages: landing, /app workspace, login, signup, account, privacy, terms, API routes
  components/          layout, landing, upload, image-grid, editor, preview, export, auth, ui
  lib/image-processing geometry (pure math), pipeline (canvas), runner (worker pool)
  lib/                 presets, validation, file names, ZIP download, thumbnails, MongoDB, users
  workers/             background image processing
  store/               Zustand store (images + settings)
  hooks/               batch processor
  auth.ts              Auth.js configuration
```
