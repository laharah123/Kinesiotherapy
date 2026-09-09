# Kinesiotherapy

A guided movement-therapy app: a short intake builds an adaptive exercise plan,
sessions track pain and effort, and the plan re-tiers itself as you progress.

Built with Expo SDK 52 (React Native 0.76), Expo Router v4, TypeScript (strict),
Zustand, Supabase and RevenueCat.

## Setup

```bash
cp .env.example .env     # then fill in the values (see "Environment" below)
npm install
npm start                # Expo dev server — press i / a, or scan the QR code
```

`npm start` opens Expo Dev Tools. `npm run ios`, `npm run android` and
`npm run web` launch a specific platform directly.

## Environment

All runtime config comes from `.env` (read via `EXPO_PUBLIC_*`, so these values
ship in the client bundle — never put service-role or secret keys here).

| Variable | Where to get it |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API |
| `EXPO_PUBLIC_RC_API_KEY_IOS` | RevenueCat → Apps → API Keys (Apple app) |
| `EXPO_PUBLIC_RC_API_KEY_ANDROID` | RevenueCat → Apps → API Keys (Google app) |

**RevenueCat keys are per platform.** The iOS key (`appl_…`) and the Android key
(`goog_…`) are different keys for different RevenueCat apps; `lib/revenuecat.ts`
picks one based on `Platform.OS`, so both must be set for both platforms to work.

## Database

The schema lives in `supabase/migrations/001_init.sql` (tables, row-level
security policies, and the signup / streak triggers). Apply it either way:

```bash
# with the Supabase CLI, against a linked project
supabase link --project-ref <your-project-ref>
supabase db push
```

or paste the contents of `supabase/migrations/001_init.sql` into the SQL editor
in the Supabase dashboard and run it.

After a schema change, regenerate the typed client:

```bash
supabase gen types typescript --project-id <your-project-ref> > lib/database.types.ts
```

## Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # typecheck + jest
npm run test:unit   # jest only
```

CI runs the same commands on every push and pull request
(`.github/workflows/ci.yml`).

## Assets

`assets/icon.png`, `assets/adaptive-icon.png` and `assets/splash.png` are
generated — regenerate them with:

```bash
npm run assets:generate
```

Fonts are not vendored: Inter and Instrument Serif are loaded at runtime from
the `@expo-google-fonts/*` packages in `app/_layout.tsx`.

## Project layout

```
app/            Expo Router routes — (auth), (intake), (main), session, subscription
components/     UI primitives, charts, and SVG exercise figures
lib/            Supabase + RevenueCat clients, Zustand stores, plan logic, design tokens
data/           Static exercise and condition catalogues
supabase/       SQL migrations
scripts/        Build-time tooling (asset generation)
__tests__/      Jest unit tests
```

## Legal pages (privacy, terms, support)

`docs/` holds the privacy policy, terms of service and support page as plain
HTML. Publish them with GitHub Pages: repository Settings → Pages → Source
"Deploy from a branch", branch `main`, folder `/docs`. They appear at
`https://laharah123.github.io/kinesiotherapy/` within a few minutes.

Before publishing, replace every highlighted `[PLACEHOLDER]` (name, address,
contact email, Supabase region, governing law, dates) and have the text
reviewed by someone qualified in your jurisdiction. The app links to these
pages from `lib/plans/links.ts`; change the constants there if you host them
elsewhere.
