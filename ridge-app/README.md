# Ridge

A marathon training app built from your own Garmin history — implemented from the `Ridge - Marathon Training App` design (see `../project` and `../chats` in the repo root for the original prototype and design conversation).

This is a real Next.js app with a Postgres database, real authentication, a real periodized plan-generation engine, a real training-load model (CTL/ATL/TSB), and a Garmin Connect OAuth2 integration — not a static mockup.

## Stack

- **Next.js 14** (App Router, TypeScript) — one codebase for frontend + API
- **Postgres** via **Prisma**
- **NextAuth** (credentials, JWT sessions) for auth
- **Garmin Connect Developer Program** OAuth2/PKCE for the real integration, with a **mock provider** fallback so the app is fully usable before that application is approved
- **Anthropic API** (optional) for the Coach chat, falling back to canned replies if no key is set

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL at minimum
npx prisma db push     # creates tables
npm run db:seed        # seeds the 5-race database
npm run dev
```

Needs a running Postgres instance matching `DATABASE_URL`. Locally:

```bash
# Debian/Ubuntu
sudo service postgresql start
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'ridge_dev';"
sudo -u postgres psql -c "CREATE DATABASE ridge;"
```

Then visit `http://localhost:3000`, create an account, and walk through onboarding — Connect Garmin will run against the **mock provider** automatically (no Garmin credentials needed) and seed ~18 months of realistic run history so the rest of the flow (analysis, plan generation, Today/Week/Plan/Load/Race/Coach) works immediately.

## What's real

- **Auth**: real signup/login, bcrypt-hashed passwords, JWT sessions.
- **Garmin OAuth2/PKCE flow**: `src/lib/garmin.ts` implements the actual Connect Developer Program authorize/token/refresh endpoints and an activity-fetch call. It activates automatically once `GARMIN_CLIENT_ID`/`GARMIN_CLIENT_SECRET` are set — see **Garmin setup** below.
- **Sync**: `/api/garmin/sync` (cron-callable, protect with `CRON_SECRET`) and `/api/garmin/webhook` (push-notification receiver) mirror the design's "synced 9:30 AM" behavior.
- **Plan generation** (`src/lib/planGenerator.ts`): a parametrized periodized generator (base → threshold → strength → peak → taper → race, cutback every 4th week), not a fixed table — it reacts to the runner's assessed level, race distance/date, days-per-week, and long-run-day preference.
- **Training load** (`src/lib/trainingLoad.ts`): real running-TSS (rTSS) fed into 42-day/7-day exponential moving averages (the same CTL/ATL/TSB construction TrainingPeaks uses), computed from actual logged activities plus not-yet-run planned workouts for the forward projection.
- **Predictions** (`src/lib/predictions.ts`): Riegel formula from best known result or a VO2max-derived equivalent (ACSM running VO2 equation).
- **Weather**: live forecast from Open-Meteo for the five seeded races' start-line coordinates when the race is within its ~16-day forecast horizon; climate-normal range otherwise.
- **Coach**: calls the Anthropic API with the runner's real plan/activity data as context when `ANTHROPIC_API_KEY` is set; otherwise falls back to the same canned-reply set as the original design prototype.

## What's still a stub / next step

- **Garmin activity-detail fetch** (`fetchRecentActivities` in `src/lib/garmin.ts`) targets the common Activity API summary endpoint. Garmin's Developer Program grants one of several API products (Activity API vs Health API) — confirm the exact path/shape against your approval email and adjust that one function. Per-mile splits/HR zones for *real* Garmin data aren't pulled yet (the mock provider generates them; a real integration needs an additional lap/detail-fetch call per activity).
- **Race database** covers 5 real marathons (St. George, Chicago, CIM, Boston, Grandma's), not Garmin/Strava's full race index. Add rows to the `Race` table (`prisma/seed.ts`) to extend it.
- **Nothing auto-runs the daily sync yet** — wire `/api/garmin/sync` to a scheduler (Vercel Cron, a cron job, etc.) with `CRON_SECRET` set.

## Garmin setup

1. Apply at the [Garmin Connect Developer Program](https://developer.garmin.com/gc-developer-program/) — this requires approval, it's not a self-serve API key.
2. Once approved, set `GARMIN_CLIENT_ID`, `GARMIN_CLIENT_SECRET`, and `GARMIN_REDIRECT_URI` in `.env`.
3. Register your webhook URL (`/api/garmin/webhook`) and redirect URI in the Developer Portal.
4. Confirm which API product you were granted and adjust `fetchRecentActivities` in `src/lib/garmin.ts` if the endpoint path differs.

Until then, the app runs entirely on the mock provider — same code paths, synthetic data.

## Project layout

```
prisma/schema.prisma      # User, GarminConnection, Activity, Race, TrainingPlan, PlanWeek, Workout, CoachMessage
src/lib/
  garmin.ts                # OAuth2/PKCE + mock provider
  sync.ts                  # initial + incremental activity sync
  trainingLoad.ts           # CTL/ATL/TSB math
  loadSeries.ts             # plan-length load series (real history + projected plan)
  planGenerator.ts          # periodized plan generator
  assessment.ts             # onboarding answers + history -> assessed level
  predictions.ts, vo2max.ts # race-time predictions
  weather.ts                 # race-morning forecast
  coach.ts                   # LLM coach + canned fallback
  actions.ts                  # server actions (onboarding, plan create/adjust, workout toggle)
src/app/
  onboarding/…               # Welcome → Signup → Connect Garmin → Questions → Analyzing → Race → Plan review
  app/…                       # Today, Week, Plan, Load, Run detail, Race day, Coach
```
