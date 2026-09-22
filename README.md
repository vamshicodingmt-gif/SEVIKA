<div align="center">

# 🌸 Sevika

**A free marketplace connecting customers with beauty & grooming professionals.**

**0% commission. No booking fees. No payment processing — ever.**
*Payment arrangements are made directly between the customer and professional.*

Next.js 14 · TypeScript · Prisma · PostgreSQL + PostGIS · NextAuth · Tailwind · shadcn/ui · TanStack Query · Zustand · Recharts

</div>

---

## What is Sevika?

Sevika lets customers **discover professionals, view portfolios and certificates, chat, book appointments** (individual, group and event bookings), and **manage everything from dashboards**. Artists get a professional profile, service catalogue, live availability calendar, booking inbox, chat, verification badges and reputation tools. Admins run the platform: user management, verification, moderation, reports, support tickets, analytics and an audit log.

**Sevika is deliberately a discovery + booking + communication marketplace.** There are no payment gateways, checkout flows, escrow, payouts, commissions or fees anywhere in the codebase. Booking a service is always free; the platform never touches money.

## Roles

| Role | Highlights |
|---|---|
| **Customer** | Search & filter artists, city + nearby (PostGIS) discovery, profiles, portfolios, verified certificates, reviews, favorites, free booking requests, reschedule/cancel, group & event bookings, direct chat, notifications |
| **Artist** | Professional profile with geo location, services with prices & durations, weekly working hours, blocked dates, booking inbox (confirm / decline / start / complete), reschedule negotiation, portfolio & certificate uploads, verification requests, Online/Busy/Offline status, rating & job analytics |
| **Admin** | Analytics dashboard, user & artist management (suspend/restore/roles), verification queue with certificate review, booking & service oversight, review & portfolio moderation, reports, support tickets, audit log |

## Tech stack

- **Frontend** — Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui-style components (Radix), Framer Motion, Zustand, React Hook Form + Zod, TanStack Query, Recharts, next-themes
- **Backend** — Next.js API routes, Auth.js (NextAuth v4) credentials + JWT, Prisma ORM, Zod validation
- **Database** — PostgreSQL with **PostGIS** (`ST_DWithin`/`ST_Distance` for nearby discovery, automatic haversine fallback), bcrypt password hashing
- **Realtime** — TanStack Query polling (4–15 s) for chat, notifications and dashboards; Vercel-serverless friendly by design
- **Storage** — AWS S3 presigned uploads (primary), Cloudinary signed uploads (fallback), local disk in dev. JPG / PNG / WebP / PDF / MP4 up to 50 MB
- **Maps** — Google Maps via `@vis.gl/react-google-maps`
- **Redis (optional)** — Upstash rate limiting on auth/booking/messaging endpoints (bypassed when unset)
- **Email (optional)** — Nodemailer SMTP; logs to console when unset
- **PWA** — web manifest, icons, theme colour, standalone display

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL + PostGIS (or point DATABASE_URL at any hosted PG)
docker compose up -d

# 3. Configure environment
cp .env.example .env        # defaults match docker-compose

# 4. Create schema + demo data
npm run db:migrate:dev      # applies prisma/migrations (incl. PostGIS setup)
npm run db:seed             # artists, bookings, chats, reviews, admin…

# 5. Run
npm run dev                 # http://localhost:3000
```

### Demo accounts

| Account | Email | Password |
|---|---|---|
| Admin | `admin@sevika.app` | `Admin@12345` |
| Artist (verified, Mumbai) | `aarohi@sevika.app` | `Password@123` |
| Artist (barber, Bengaluru) | `kabir@sevika.app` | `Password@123` |
| Customer | `priya@sevika.app` | `Password@123` |
| Customer | `rohan@sevika.app` | `Password@123` |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | Prisma generate + production build |
| `npm start` | Production server |
| `npm run test` | Vitest unit tests (slot engine, validation, utils) |
| `npm run typecheck` | Strict TypeScript check |
| `npm run db:migrate` | Apply migrations (`prisma migrate deploy`) |
| `npm run db:migrate:dev` | Create/apply dev migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Prisma Studio |

## Deploying to Vercel

The build passes with zero environment variables, so importing the repo into Vercel will succeed.
The app only becomes *functional* once the database is connected — follow these steps in order:

**1. Create a PostgreSQL database** (any of: Vercel Postgres, Neon, Supabase, Railway).
Copy the connection string (the **pooled** URL if your provider offers one).
PostGIS is optional — Sevika auto-detects it and falls back to haversine distance search.

**2. Import the repo in Vercel.** Leave *Root Directory* empty. `vercel.json` pins the build
(`prisma generate && next build`) — no other build settings needed.

**3. Add environment variables** in Vercel → Settings → Environment Variables:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | The Postgres connection string from step 1 |
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Your production URL, e.g. `https://sevika.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Same URL as above (used in emails/links) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | recommended | Maps JavaScript API key (map views) |
| `S3_REGION`, `S3_BUCKET_NAME`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | for uploads | Portfolio/certificate/avatar uploads |
| `CLOUDINARY_*` | alternative | Cloudinary instead of S3 |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | optional | Rate limiting |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `EMAIL_FROM` | optional | Transactional email (logged to console when unset) |

**4. Create the tables (one-time, from your machine):**

```bash
DATABASE_URL="<your production database url>" npx prisma migrate deploy
```

**5. Redeploy** (Deployments → ⋯ → Redeploy) so the serverless functions pick up the new env vars.

**6. Verify** — open `https://your-app.vercel.app/api/health` and confirm `"database": "connected"`.
Then create an account at `/register` and sign in at `/login`.

Optional demo data (artists, bookings, reviews — includes the `admin@sevika.app` account):

```bash
DATABASE_URL="<your production database url>" npm run db:seed
```

### Troubleshooting

| Symptom | Cause & fix |
|---|---|
| `/api/health` says `database: unreachable` | `DATABASE_URL` missing/wrong, or host requires SSL params — check your provider's pooled connection string |
| APIs say "Database tables are missing" | Run `npx prisma migrate deploy` (step 4) |
| Sign-in always says "Invalid email or password" | No account yet — register first at `/register`; demo accounts exist only after seeding |
| PostGIS notices in migrate output | Expected on non-PostGIS hosts — nearby discovery uses haversine automatically |

> The booking calendar uses the **artist's wall-clock convention**: slot times are stored as UTC instants whose wall clock equals the artist's local time and are rendered with `timeZone: "UTC"`, keeping the slot engine pure and unit-tested.

## Project structure

```
prisma/
  schema.prisma            # 20 models — users, artists, bookings, chat, trust & safety
  migrations/              # 0001_init (SQL) + 0002_postgis (geo column, trigger, GIST index)
  seed.ts                  # demo marketplace data
src/
  app/
    (site)/                # public + customer app: discover, artists, booking wizard,
    (studio)/artist/       #   bookings, messages, favorites, account, support, legal
    (console)/admin/       # artist studio: dashboard, services, availability,
    api/                   #   portfolio, certificates, profile
                           # admin console: analytics, users, verifications,
                           #   moderation, bookings, reports, tickets, audit
                           # 35+ REST route handlers (auth, bookings, slots, chat…)
  components/              # UI kit (Radix-based), site chrome, cards, map, wizard
  lib/                     # db, auth, slots engine, geo, upload, mail, notifications,
                           #   rate limit, audit, zod validators, api helpers
  store/                   # Zustand (booking wizard)
  middleware.ts            # edge route protection (role-aware)
```

## Testing

```bash
npm run test
```

Unit suites cover the booking slot engine (working hours, blocked dates, conflict subtraction, lead time, slot granularity), Zod validation schemas (registration, services, bookings incl. group-event and address rules) and shared formatters. The slot engine is intentionally pure so the trickiest business logic is fully deterministic.

## Notes & conventions

- **No payments, by design.** No Razorpay/Stripe/PayPal, no `payments/` routes, no commission or payout code exists. Booking payloads carry no payment data. Where money could be misunderstood, the UI states: *“Payment arrangements are made directly between the customer and professional.”*
- Bookings are free to create; only the artist's live availability constrains them.
- All admin actions and sensitive events (suspension, verification decisions, moderation) are written to the audit log.
- Content safety: portfolio items and reviews are moderated; reports and support tickets are built in.
