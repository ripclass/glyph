# Glyph Deployment Guide

> Last updated: April 2026

## Overview

Glyph uses a two-platform deployment architecture:
- **Vercel** for the Next.js PWA frontend
- **Supabase Cloud** for the database, authentication, storage, edge functions, and realtime

This guide covers the complete deployment pipeline from local development to production.

---

## Architecture Diagram

```
+------------------+     +------------------+     +------------------+
|  GitHub Repo     | --> |  GitHub Actions  | --> |  Vercel          |
|                  |     |  (CI pipeline)   |     |  (PWA hosting)   |
|  main branch     |     |  - lint          |     |                  |
|  PR branches     |     |  - type-check    |     |  Auto-deploy:    |
|                  |     |  - test          |     |  - main -> prod  |
|                  |     |  - build         |     |  - PR -> preview |
+------------------+     +------------------+     +------------------+
                                                          |
                                                          v
                                                  +------------------+
                                                  |  Supabase Cloud  |
                                                  |                  |
                                                  |  - PostgreSQL 15 |
                                                  |  - Auth (OTP)    |
                                                  |  - Storage       |
                                                  |  - Edge Functions|
                                                  |  - Realtime      |
                                                  +------------------+
```

---

## Vercel Deployment

### Initial Setup

1. **Create Vercel project**:
   ```bash
   cd web
   npx vercel link
   ```
   - Select the KhaM Health team
   - Link to the GitHub repository
   - Set the root directory to `web/` (since the Next.js app is in the `web` workspace)

2. **Configure build settings**:
   - Framework preset: Next.js
   - Root directory: `web`
   - Build command: `npm run build` (default)
   - Output directory: `.next` (default)
   - Install command: `npm ci` (at root level, handles workspaces)

3. **Configure Node.js version**:
   - Set to Node.js 20.x (matches `engines` in `package.json`)

### Environment Variables

Set these in the Vercel dashboard under Project Settings > Environment Variables:

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All environments | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All environments | Supabase anonymous key (safe for client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Supabase service role key (server-only) |
| `NEXT_PUBLIC_APP_ENV` | Per environment | `development`, `preview`, or `production` |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | All environments | Default language (`bn`) |
| `NEXT_PUBLIC_APP_NAME` | All environments | App name (`Glyph`) |

**Important**: `NEXT_PUBLIC_` prefixed variables are exposed to the browser. Only Supabase URL and anon key should have this prefix. All sensitive keys (service role, API keys) must NOT have the `NEXT_PUBLIC_` prefix.

**Environment-specific values**: Use different Supabase projects for each environment:
- Production: `https://glyph-prod.supabase.co`
- Preview: `https://glyph-staging.supabase.co`
- Development: `http://localhost:54321` (local Supabase)

### Automatic Deployments

Vercel automatically deploys:
- **Production**: Every push to `main` branch
- **Preview**: Every pull request gets a unique preview URL

### PWA Deployment Considerations

The PWA configuration (`next-pwa`) requires special attention:

1. **Service worker**: `public/sw.js` is generated during build by `next-pwa`. It handles offline caching of the app shell and static assets.

2. **Manifest**: `public/manifest.json` defines the PWA metadata. Ensure:
   - `start_url` is `/`
   - `display` is `standalone`
   - Icons at 192x192 and 512x512 are present in `public/icons/`

3. **Service worker updates**: When deploying updates, the service worker auto-updates via `skipWaiting: true` in the `next-pwa` configuration. Users get the new version on their next visit.

4. **PWA disabled in development**: The `next-pwa` config sets `disable: process.env.NODE_ENV === 'development'` to avoid service worker caching issues during development.

### Custom Domain Setup

1. Add the domain in Vercel dashboard: Project Settings > Domains
2. Configure DNS:
   - **A record**: Point `@` to Vercel's IP (76.76.21.21)
   - **CNAME record**: Point `www` to `cname.vercel-dns.com`
3. SSL/TLS certificate is automatically provisioned by Vercel (Let's Encrypt)
4. HTTPS is enforced automatically (HTTP redirects to HTTPS)

### SSL/TLS

Vercel handles SSL/TLS automatically:
- Let's Encrypt certificates provisioned for all domains
- Automatic renewal before expiration
- TLS 1.2 and 1.3 supported
- HTTP Strict Transport Security (HSTS) headers configured
- No manual certificate management required

---

## Supabase Cloud Deployment

### Initial Setup

1. **Create Supabase project**:
   - Go to https://supabase.com/dashboard
   - Create a new project in the KhaM Health organization
   - Region: Choose based on Bangladesh latency requirements
   - Database password: Generate a strong password and store securely

2. **Link local project**:
   ```bash
   supabase login
   supabase link --project-ref your-project-ref
   ```

3. **Apply migrations**:
   ```bash
   supabase db push
   ```
   This applies `supabase/migrations/001_initial_schema.sql` to the remote database.

4. **Configure Auth**:
   - Enable Phone OTP authentication in the Supabase dashboard
   - Configure SMS provider (Twilio, MessageBird, or Vonage)
   - Set SMS template for OTP messages (in Bangla)
   - Configure rate limiting for OTP attempts

5. **Configure Storage**:
   Create storage buckets:
   ```sql
   INSERT INTO storage.buckets (id, name, public, file_size_limit)
   VALUES
     ('rx-images', 'rx-images', false, 52428800),
     ('lab-images', 'lab-images', false, 52428800),
     ('audio-recordings', 'audio-recordings', false, 104857600);
   ```
   - `rx-images`: Prescription photos (50MB limit)
   - `lab-images`: Lab report photos (50MB limit)
   - `audio-recordings`: Temporary audio files (100MB limit)

   Configure storage RLS policies to restrict access to authenticated doctors from the same clinic.

6. **Configure Realtime**:
   Realtime is enabled by default. Ensure the `visits` table has Realtime enabled:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE visits;
   ```

### Edge Functions Deployment

Edge Functions are deployed via the Supabase CLI:

```bash
# Deploy a single function
supabase functions deploy transcribe-audio

# Deploy all functions
supabase functions deploy
```

**Edge Function environment variables** (set in Supabase dashboard or CLI):

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set GOOGLE_CLOUD_SPEECH_KEY=AIza...
supabase secrets set GOOGLE_AI_STUDIO_KEY=AIza...
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set PERPLEXITY_API_KEY=pplx-...
supabase secrets set UPTODATE_API_KEY=ut-...
supabase secrets set UPTODATE_BASE_URL=https://api.connect.uptodate.com
supabase secrets set WHATSAPP_BUSINESS_TOKEN=EAA...
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=1234...
```

**Critical**: These secrets are available only within Edge Functions. They are never exposed to the client or the Next.js server.

### Database Migrations

New migrations are created and applied via the Supabase CLI:

```bash
# Create a new migration
supabase migration new add_some_feature

# Apply pending migrations locally
supabase db reset

# Push migrations to remote
supabase db push
```

**Migration workflow**:
1. Create migration locally
2. Test with `supabase db reset` (resets local database and re-applies all migrations + seed)
3. Commit migration file to git
4. After PR merge, apply to staging: `supabase db push --linked`
5. After staging validation, apply to production

---

## CI/CD Pipeline

### GitHub Actions

The CI pipeline is defined in `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test -- --run
      - run: npm run build
```

**Pipeline stages:**

| Stage | Command | Purpose | Failure Action |
|---|---|---|---|
| Install | `npm ci` | Install exact dependency versions | Fix lockfile |
| Lint | `npm run lint` | ESLint checks | Fix lint errors |
| Type Check | `npm run type-check` | TypeScript compiler check (`tsc --noEmit`) | Fix type errors |
| Test | `npm run test -- --run` | Vitest unit tests (single run, no watch) | Fix failing tests |
| Build | `npm run build` | Next.js production build | Fix build errors |

### Deployment Flow

```
Developer pushes code
        |
        v
GitHub Actions CI runs
        |
   +----+----+
   |         |
   v         v
 Pass      Fail
   |         |
   v         v
Vercel     Block merge
auto-deploys
   |
   +--------+--------+
   |                 |
   v                 v
PR -> Preview    main -> Production
deployment       deployment
```

### Manual Deployment Steps

If automatic deployment needs to be supplemented:

**Vercel (manual deploy):**
```bash
cd web
npx vercel          # Preview deployment
npx vercel --prod   # Production deployment
```

**Supabase (manual steps):**
```bash
# Apply database migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy

# Update secrets
supabase secrets set KEY=value
```

---

## Environment Variable Management

### Local Development

Copy `.env.example` to `.env.local`:
```bash
cp .env.example web/.env.local
```

Fill in the values for local Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (from supabase start output)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (from supabase start output)
NEXT_PUBLIC_APP_ENV=development
```

### Environment Variable Hierarchy

| Source | Priority | Used In |
|---|---|---|
| `.env.local` | Highest (local only, gitignored) | Local development |
| `.env.development` | Medium | `next dev` |
| `.env.production` | Medium | `next build` |
| `.env` | Lowest | All environments |
| Vercel Environment Variables | Overrides file-based | Vercel deployments |
| Supabase Secrets | Edge Functions only | Edge Function runtime |

### Secret Rotation

To rotate secrets:

1. **Supabase API keys**: Regenerate in Supabase dashboard > Settings > API. Update Vercel env vars and local `.env.local`.
2. **AI API keys**: Regenerate in the respective provider's dashboard. Update Supabase secrets and local `.env.local`.
3. **WhatsApp token**: Regenerate in Meta Business Suite. Update Supabase secrets.

After rotation, redeploy Edge Functions to pick up new secrets:
```bash
supabase functions deploy
```

---

## Monitoring and Logging

### Vercel Monitoring

- **Build logs**: Available in Vercel dashboard per deployment
- **Runtime logs**: Vercel Functions logs (server-side rendering)
- **Web Vitals**: Core Web Vitals tracking via Vercel Analytics
- **Error tracking**: Vercel integrates with Sentry for error monitoring (recommended)

### Supabase Monitoring

- **Database**: Supabase dashboard > Database > Query Performance
- **Auth**: Supabase dashboard > Authentication > Logs
- **Storage**: Supabase dashboard > Storage > Usage
- **Edge Functions**: Supabase dashboard > Edge Functions > Logs
  - Each function invocation logged with status code, duration, and errors
- **Realtime**: Supabase dashboard > Realtime > Connections

### Application-Level Monitoring

- **API cost tracking**: The `api_usage_log` table provides per-visit, per-model cost tracking. Query for daily/weekly cost summaries:
  ```sql
  SELECT
    DATE(created_at) as day,
    model_used,
    COUNT(*) as calls,
    SUM(estimated_cost_usd) as total_cost,
    AVG(latency_ms) as avg_latency
  FROM api_usage_log
  GROUP BY DATE(created_at), model_used
  ORDER BY day DESC;
  ```

- **Fallback rate monitoring**: Track how often fallback models are used:
  ```sql
  SELECT
    edge_function,
    COUNT(*) FILTER (WHERE was_fallback) as fallback_count,
    COUNT(*) as total_count,
    ROUND(100.0 * COUNT(*) FILTER (WHERE was_fallback) / COUNT(*), 2) as fallback_pct
  FROM api_usage_log
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY edge_function;
  ```

- **Visit funnel**: Track conversion through the visit lifecycle:
  ```sql
  SELECT
    status,
    COUNT(*) as visit_count
  FROM visits
  WHERE visit_date = CURRENT_DATE
  GROUP BY status;
  ```

### Alerting

Recommended alerts (implement via Supabase webhooks or external monitoring):

| Alert | Condition | Severity |
|---|---|---|
| High fallback rate | Fallback rate > 5% for any Edge Function in 1 hour | Warning |
| High API cost | Daily AI cost > $50 | Warning |
| Edge Function errors | Error rate > 10% for any function in 15 minutes | Critical |
| Database connection saturation | Connection count > 80% of max | Critical |
| Storage quota approaching | Storage usage > 80% of plan limit | Warning |
| Auth OTP failures | OTP failure rate > 50% in 10 minutes | Critical |

---

## Production Checklist

Before going to production, verify:

### Vercel
- [ ] Custom domain configured with SSL
- [ ] Environment variables set for production
- [ ] Node.js 20 configured
- [ ] Root directory set to `web`
- [ ] PWA manifest icons present (`public/icons/icon-192.png`, `public/icons/icon-512.png`)
- [ ] Service worker generates correctly during build
- [ ] `robots.txt` configured appropriately
- [ ] Error pages (`404`, `500`) are styled

### Supabase
- [ ] Production project created (separate from staging)
- [ ] All migrations applied (`supabase db push`)
- [ ] Storage buckets created with appropriate size limits
- [ ] RLS policies verified on all tables
- [ ] Auth OTP configured with SMS provider
- [ ] Realtime enabled for `visits` table
- [ ] Edge Functions deployed with all secrets set
- [ ] Database backups configured (Supabase Pro plan or higher)
- [ ] Connection pooling configured (PgBouncer)

### Security
- [ ] No `NEXT_PUBLIC_` prefix on sensitive keys
- [ ] Service role key not exposed to client
- [ ] CORS configured on Supabase (allow only production domain)
- [ ] Rate limiting configured on Edge Functions
- [ ] Storage RLS policies restrict access to authenticated doctors
- [ ] Database password is strong and stored securely

### Monitoring
- [ ] Error tracking service connected (Sentry recommended)
- [ ] API cost alerts configured
- [ ] Database performance monitoring enabled
- [ ] Uptime monitoring configured for production URL

### Compliance
- [ ] Consent collection flow tested end-to-end
- [ ] De-identification verified in Edge Function logs
- [ ] Audio deletion policy automated (24-hour TTL)
- [ ] Data export feature tested
- [ ] Privacy policy page deployed
