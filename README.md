# PixForge

Bulk image resizer for every platform. Resize, convert and compress images for Instagram, YouTube, Facebook, Google Ads and more. All image processing happens **in the browser**: photos are never uploaded.

## Features

### Version 2: AI tools (bring your own key)
- API Key page: users add their own fal.ai key; stored AES-256-GCM encrypted, never sent back to the browser
- AI Tools page: Remove background (BRIA), Magic eraser with brush mask (BRIA Eraser), AI upscale 2× (Clarity)
- Images are downscaled before sending (2048 px, 1024 px for upscale), uploads to fal expire after 1 hour
- Results: before/after slider, download, add to Bulk Editor, or chain into another AI tool
- Consent checkbox before sending any image; clear error messages for bad keys or empty balance
- Background extend (BRIA Expand): fit any ratio without cropping; AI fills the empty area
- Edit with a prompt (FLUX.1 Kontext pro): e.g. "make the background pure white"
- `PIXFORGE_AI_MOCK=1` fake AI for local development (never active in production)

### Version 2: free creative tools (in the browser)
- Filters: brightness, contrast, saturation and B&W / Sepia / Warm / Cool / Vintage, with live thumbnail preview
- Collage maker: 9 layouts, 5 sizes (incl. A4), gap, border, rounded corners, background color, JPG/PNG
- Images to PDF: A4 / Letter / fit-to-image, auto orientation, margins, 3 quality levels (pdf-lib)

### Phase 3
- Saved Presets: create your own sizes (account or this browser) and use them next to platform presets
- History: every batch with images, files, sizes, format and size change (numbers only), with clear history
- Watermark: text or logo, 9 positions, size, opacity, margin, or repeated across the image
- File size limit: e.g. "max 100 KB" for JPG/WebP; quality is lowered automatically, and the image is made slightly smaller only if needed
- Batch rename with tokens: {name}, {n}, {w}, {h}, {size}, {date}, start number and digits
- Before/after comparison slider for every output size

### Phase 2
- Dashboard with sidebar: Overview, Bulk Editor, Crop & Rotate, Settings, Account (mobile menu drawer)
- Crop Studio: free crop, fixed ratios (1:1, 4:5, 9:16, 16:9 …) and social presets, drag handles, exact pixel read-out, "apply to all"
- Rotate 90° and flip horizontal/vertical, per image or for all selected images (crop follows the rotation)
- HEIC/HEIF (iPhone) photos converted to JPEG in the browser
- Saved default settings (account or this browser) and "Save as default" in the editor
- Overview with batch stats for signed-in users (only numbers are stored, never images)

### Phase 1

- Drag & drop bulk upload (JPG, PNG, WebP, HEIC), with validation and clear reasons for skipped files
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
| `AUTH_SECRET` | for login | Random secret. See DEPLOY.md, step 2 |
| `MONGODB_URI` | for login | MongoDB Atlas connection string |
| `MONGODB_DB` | no | Database name (default `pixforge`) |
| `KEY_ENCRYPTION_SECRET` | for AI keys | Encrypts saved fal.ai keys (falls back to `AUTH_SECRET`) |
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

## Deploy

Step-by-step guide (MongoDB Atlas, Vercel, Google login, custom domain): see [DEPLOY.md](DEPLOY.md).
