# Glyph by KhaM Health

**Clinical AI workflow for Bangladeshi doctors.**

Glyph is a progressive web application that augments the doctor-patient encounter with AI-powered intake, real-time briefing generation, ambient consultation recording, clinical note drafting, and automated follow-up. It is designed specifically for the Bangladeshi clinical context -- Bangla-first, voice-first, and built around the attendant dynamic unique to South Asian healthcare.

---

## What Glyph Does

1. **Patient Intake** (Tablet): A voice-first conversational AI assistant collects patient history in Bangla, captures photos of existing prescriptions and lab reports, and extracts structured data automatically
2. **Briefing Card** (Doctor Phone): AI generates a structured clinical briefing with source-attributed claims, red flag alerts, and linked evidence -- ready before the patient walks in
3. **Ambient Recording** (Doctor Phone): Minimal, non-intrusive recording during the consultation with real-time transcription
4. **Clinical Research** (Doctor Phone): Mid-consultation AI research chat with UpToDate evidence, Perplexity search, and PubMed citations
5. **Note Generation** (Doctor Phone/Desktop): AI drafts a clinical note in Bangladesh prescription format (CC/OE/Ix/Rx/Advice), linked to source evidence from the encounter
6. **WhatsApp Follow-Up** (Automated): Sends visit summaries and follow-up questions to patients via WhatsApp 2-3 days after the visit

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, shadcn/ui components |
| State | Zustand |
| PWA | next-pwa (service worker, offline support) |
| Database | PostgreSQL 15 (Supabase) |
| Auth | Supabase Auth (Phone OTP) |
| Storage | Supabase Storage (Rx/lab images, audio) |
| Realtime | Supabase Realtime (queue updates) |
| API Layer | Supabase Edge Functions (Deno) |
| AI Models | Claude (Anthropic), Gemini (Google), GPT-4o (OpenAI), Google Speech-to-Text |
| Clinical Evidence | UpToDate Connect API, Perplexity, PubMed |
| Follow-Up | WhatsApp Business API |
| Hosting | Vercel (PWA), Supabase Cloud (backend) |
| CI/CD | GitHub Actions |
| Testing | Vitest, React Testing Library |
| i18n | Custom (Bangla + English) |
| Fonts | Inter, Noto Sans Bengali, JetBrains Mono |

---

## Prerequisites

- **Node.js 20+** (check with `node -v`)
- **npm 10+** (comes with Node.js 20+)
- **Supabase CLI** (`npm install -g supabase`)
- **Docker** (required for Supabase local development)
- **Git**

Optional:
- **Vercel CLI** (`npm install -g vercel`) for deployment
- Android tablet (for testing patient intake)
- WhatsApp Business account (for follow-up testing)

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/kham-health/glyph.git
cd glyph
```

### 2. Install Dependencies

```bash
npm install
```

This installs dependencies for the root workspace and the `web` package.

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example web/.env.local
```

Edit `web/.env.local` with your local Supabase values (these will be populated after starting Supabase in Step 4):

```env
# Supabase (local values populated by `supabase start`)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>

# AI API keys (get from respective providers)
ANTHROPIC_API_KEY=<your-claude-key>
GOOGLE_CLOUD_SPEECH_KEY=<your-google-speech-key>
GOOGLE_AI_STUDIO_KEY=<your-google-ai-key>
OPENAI_API_KEY=<your-openai-key>
PERPLEXITY_API_KEY=<your-perplexity-key>

# UpToDate (optional, requires Wolters Kluwer developer program)
UPTODATE_API_KEY=<your-uptodate-key>
UPTODATE_BASE_URL=https://api.connect.uptodate.com

# WhatsApp (optional, for follow-up testing)
WHATSAPP_BUSINESS_TOKEN=<your-token>
WHATSAPP_PHONE_NUMBER_ID=<your-number-id>

# App
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_DEFAULT_LANGUAGE=bn
NEXT_PUBLIC_APP_NAME=Glyph
```

**Required for basic development**: Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required to run the app locally. AI features will show fallback UI without API keys.

### 4. Start Supabase Local

```bash
supabase start
```

This starts local instances of PostgreSQL, Auth, Storage, Realtime, and Studio. On first run, it downloads Docker images (may take a few minutes).

The output will display your local API URL, anon key, and service role key. Copy these into `web/.env.local`.

### 5. Apply Database Schema and Seed Data

```bash
supabase db reset
```

This applies all migrations from `supabase/migrations/` and runs `supabase/seed.sql` to populate development data (1 clinic, 5 patients with varied medical histories).

### 6. Access Supabase Studio

Open http://localhost:54323 to browse the database, manage auth users, and inspect storage. Create a test doctor user via the Auth panel:

1. Go to Authentication > Users
2. Create a new user with a phone number (e.g., `+8801700000001`)
3. Note the user UUID
4. Insert a doctor record in the `doctors` table using that UUID as the `id`

### 7. Start the Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3000.

**Key pages:**
- http://localhost:3000 -- Landing page
- http://localhost:3000/intake -- Patient intake flow
- http://localhost:3000/doctor -- Doctor dashboard

---

## Running Locally

### Development Commands

```bash
# Start dev server (with hot reload)
npm run dev

# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests (watch mode)
npm run test

# Run tests (single run, CI mode)
npm run test -- --run

# Build for production
npm run build

# Start production server (after build)
npm start
```

### Supabase Commands

```bash
# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# Reset database (re-apply migrations + seed)
supabase db reset

# Create a new migration
supabase migration new <name>

# View migration status
supabase migration list

# Open Supabase Studio
# http://localhost:54323

# Deploy Edge Functions (to remote)
supabase functions deploy

# Serve Edge Functions locally
supabase functions serve
```

---

## Project Structure

```
glyph/
+-- .env.example                 # Environment variable template
+-- .github/
|   +-- workflows/
|       +-- ci.yml               # GitHub Actions CI pipeline
+-- package.json                 # Root workspace configuration
+-- supabase/
|   +-- config.toml              # Supabase local dev configuration
|   +-- migrations/
|   |   +-- 001_initial_schema.sql  # Database schema (tables, RLS, triggers)
|   +-- seed.sql                 # Development seed data
+-- docs/                        # Project documentation
|   +-- architecture.md          # System architecture
|   +-- api-routing.md           # AI model routing table
|   +-- data-model.md            # Database schema documentation
|   +-- clinical-workflow.md     # End-to-end patient flow
|   +-- attendant-protocol.md    # Attendant handling protocol
|   +-- abridge-patterns.md      # Abridge-inspired design patterns
|   +-- pdpo-compliance.md       # Bangladesh data protection compliance
|   +-- uptodate-integration.md  # UpToDate API integration guide
|   +-- deployment.md            # Deployment guide
+-- web/                         # Next.js PWA (main application)
    +-- next.config.ts           # Next.js + PWA configuration
    +-- package.json             # Web app dependencies
    +-- tailwind.config.ts       # Tailwind CSS with Glyph theme
    +-- tsconfig.json            # TypeScript configuration
    +-- postcss.config.js        # PostCSS configuration
    +-- public/
    |   +-- manifest.json        # PWA manifest
    |   +-- sw.js                # Service worker (generated by next-pwa)
    +-- src/
        +-- app/                 # Next.js App Router pages
        |   +-- page.tsx         # Landing page
        |   +-- layout.tsx       # Root layout
        |   +-- intake/          # Patient intake flow
        |   |   +-- layout.tsx   #   Intake layout (large text, Bangla-first)
        |   |   +-- page.tsx     #   Role selection (patient vs attendant)
        |   |   +-- history/     #   Medical history conversation
        |   |   +-- conversation/#   Active voice conversation
        |   |   +-- summary/     #   Intake summary review
        |   +-- doctor/          # Doctor-facing views
        |       +-- layout.tsx   #   Doctor layout (dense, professional)
        +-- components/
        |   +-- doctor/          # Doctor-facing components
        |   |   +-- AmbientRecorder.tsx   # Consultation recording bar
        |   |   +-- BriefingCard.tsx      # Patient briefing card
        |   |   +-- CitationChip.tsx      # Inline citation display
        |   |   +-- LinkedEvidence.tsx    # Evidence detail panel
        |   |   +-- NoteFormatBD.tsx      # Bangladesh-format clinical note
        |   |   +-- PatientQueue.tsx      # Today's patient queue
        |   |   +-- RedFlagAlert.tsx      # Critical finding alerts
        |   |   +-- SourceTag.tsx         # Source attribution tag
        |   |   +-- UpToDatePanel.tsx     # UpToDate evidence panel
        |   +-- intake/          # Patient intake components
        |   |   +-- AttendantBanner.tsx   # Attendant indicator banner
        |   |   +-- DocumentCapture.tsx   # Camera capture for Rx/labs
        |   |   +-- ExtractedLabCard.tsx  # Extracted lab results display
        |   |   +-- ExtractedRxCard.tsx   # Extracted prescription display
        |   |   +-- PatientMessage.tsx    # Patient chat bubble
        |   |   +-- SaaraMessage.tsx      # AI assistant chat bubble
        |   |   +-- VoiceOrb.tsx          # Push-to-talk voice button
        |   +-- shared/          # Shared components
        |   |   +-- LanguageToggle.tsx    # Bangla/English toggle
        |   |   +-- LoadingStream.tsx     # Streaming content loader
        |   |   +-- Logo.tsx             # Glyph logo
        |   +-- ui/              # shadcn/ui base components
        |       +-- badge.tsx
        |       +-- button.tsx
        |       +-- card.tsx
        |       +-- dialog.tsx
        |       +-- input.tsx
        |       +-- skeleton.tsx
        |       +-- textarea.tsx
        +-- lib/
        |   +-- i18n/            # Internationalization
        |   |   +-- bn.json      #   Bangla translations
        |   |   +-- en.json      #   English translations
        |   |   +-- index.ts     #   i18n utility
        |   +-- supabase/        # Supabase client configuration
        |   |   +-- client.ts    #   Browser client
        |   |   +-- server.ts    #   Server client (SSR)
        |   |   +-- types.ts     #   Database type definitions
        |   +-- utils/
        |       +-- cn.ts        #   Tailwind class merging utility
        |       +-- cost-tracker.ts     # AI API cost estimation
        |       +-- format-date-bd.ts   # Bangladesh date formatting
        |       +-- format-prescription.ts # Rx format utilities
        +-- styles/
            +-- globals.css      # Global styles + CSS variables
```

---

## Documentation

Detailed documentation is available in the `docs/` directory:

| Document | Description |
|---|---|
| [Architecture](docs/architecture.md) | System architecture, components, data flow |
| [API Routing](docs/api-routing.md) | AI model routing table with rationale |
| [Data Model](docs/data-model.md) | Database schema, tables, RLS policies |
| [Clinical Workflow](docs/clinical-workflow.md) | End-to-end patient flow (10 steps) |
| [Attendant Protocol](docs/attendant-protocol.md) | How Glyph handles the attendant dynamic |
| [Abridge Patterns](docs/abridge-patterns.md) | Patterns adapted from Abridge |
| [PDPO Compliance](docs/pdpo-compliance.md) | Bangladesh data protection compliance |
| [UpToDate Integration](docs/uptodate-integration.md) | UpToDate Connect API guide |
| [Deployment](docs/deployment.md) | Vercel + Supabase deployment guide |

---

## Contributing

### Branch Strategy

- `main` -- production-ready code, auto-deploys to production
- Feature branches -- created from `main`, merged via pull request
- PR branches get automatic Vercel preview deployments

### Development Workflow

1. Create a feature branch from `main`
2. Make changes
3. Run `npm run lint && npm run type-check && npm run test -- --run` locally
4. Push and create a pull request
5. CI runs automatically (lint, type-check, test, build)
6. Vercel creates a preview deployment
7. Code review
8. Merge to `main`
9. Automatic production deployment

### Code Conventions

- **TypeScript**: Strict mode enabled. All new code must be fully typed.
- **Components**: React Server Components by default. Add `"use client"` only when client-side interactivity is needed.
- **Styling**: Tailwind CSS only. No CSS modules or styled-components. Use the `cn()` utility for conditional classes.
- **Naming**: PascalCase for components, camelCase for functions and variables, kebab-case for file names.
- **i18n**: All user-facing text should have i18n keys in `bn.json` and `en.json`. Use Bangla as the primary language.
- **Accessibility**: All interactive elements must have `aria-label` or visible labels. Use semantic HTML elements.
- **Documentation**: Complex components should have JSDoc comments explaining purpose, design decisions, and usage examples.

---

## License

Proprietary. Copyright 2026 KhaM Health. All rights reserved.
