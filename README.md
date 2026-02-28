# Receptionist Swarm OS

Multi-tenant SaaS platform for AI phone agents serving local businesses. Autopilot onboarding, AgentPack versioning, inbound call runtime via Retell, transfer, SMS recap, and call logs/analytics.

## Architecture

```
receptionist-swarm-os/
├── apps/
│   └── console/          # Next.js 14 + Tailwind — management dashboard
├── services/
│   └── api/              # NestJS REST API + webhooks
├── packages/
│   └── shared/           # Shared types, interfaces, constants
├── docker-compose.yml    # Postgres + Redis + API + Console
└── .env.example          # Environment variables template
```

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for Postgres + Redis)
- npm

### 1. Clone & Install

```bash
git clone <repo-url> && cd receptionist-swarm-os
npm install                          # root workspace
cd packages/shared && npm install && npm run build && cd ../..
cd services/api && npm install && cd ../..
cd apps/console && npm install && cd ../..
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your API keys (optional — mock adapters work without them)
```

### 3. Start Infrastructure

```bash
docker-compose up -d postgres redis
```

### 4. Run the API

```bash
cd services/api
npm run start:dev
# API runs on http://localhost:4000
```

### 5. Seed Demo Data

```bash
cd services/api
npx ts-node src/database/seed.ts
# Creates: Acme Services org, 3 locations (HVAC, Dental, MedSpa),
#          3 deployed AgentPacks, 30 sample calls with transcripts
# Demo login: demo@acmeservices.com / demo123
```

### 6. Run the Console

```bash
cd apps/console
npm run dev
# Console runs on http://localhost:3000
```

### Docker Compose (All-in-One)

```bash
docker-compose up --build
# API: http://localhost:4000
# Console: http://localhost:3000
```

## Features (MVP)

### Multi-Tenant Data Model
- **Orgs** → **Locations** → **AgentPacks** → **Calls**
- Users with roles (org_admin, admin, agent_viewer)
- Billing plans with concurrency limits

### Autopilot Onboarding Pipeline
1. **Crawl** — Fetch & parse business website (up to 5 pages)
2. **Extract** — Identify services, hours, FAQs, policies, industry
3. **Generate** — Create full AgentPack config (persona, flows, tools, escalation)
4. **5Q Confirm** — Owner answers 5 questions to customize behavior
5. **Deploy** — Activate AgentPack + assign phone number

### AgentPack Versioning
- Immutable versions per location
- `current_version` pointer for instant rollback
- States: `draft` → `confirmed` → `deployed`
- Full config stored as JSON: persona, flows, tools, KB, escalation matrix

### Inbound Call Runtime (Retell)
- Webhook handler for inbound calls + events
- Deterministic state machine: Greeting → Intent → Booking/Lead/FAQ → Transfer → Wrapup
- Tool execution during calls (SMS, search, calendar, CRM)
- Transcript storage + SMS recap

### Swarm Router (Concurrency Gating)
- Per-tenant concurrency limits from billing plan
- Accept / Queue / Callback / Overflow decisions
- Queue management with promotion on call release

### Provider Adapters (Pluggable)
All providers use adapter interfaces — swap implementations without code changes.

| Provider | Interface | Default | Mock Fallback |
|----------|-----------|---------|---------------|
| Voice | `VoiceProviderAdapter` | Retell | Yes (no API key needed) |
| SMS | `SmsProviderAdapter` | Twilio | Yes (logs to console) |
| Search | `SearchProviderAdapter` | Perplexity | Yes (returns sample results) |
| LLM | `LlmProviderAdapter` | OpenAI | Yes (returns placeholder) |

### Analytics & Observability
- Call KPIs: booking rate, lead capture, transfer rate, abandon rate
- Outcome breakdown, calls by day, top tools called
- Full transcript storage with structured extraction

## Console Pages

| Page | Path | Description |
|------|------|-------------|
| Auth | `/auth` | Login / Register |
| Dashboard | `/dashboard` | KPIs, outcome breakdown, locations overview |
| Onboarding | `/onboarding` | Scan → 5Q Confirm → Deploy wizard |
| Agent Packs | `/agent-packs` | Version list, config viewer, rollback |
| Call Logs | `/calls` | Paginated call list with transcript viewer |
| Analytics | `/analytics` | KPI cards, outcome bars, daily chart, top tools |

## API Endpoints

### Auth
- `POST /v1/auth/register` — Create account + org
- `POST /v1/auth/login` — Get JWT token
- `GET /v1/auth/me` — Current user info

### Orgs & Locations
- `GET /v1/orgs/current` — Current org
- `GET /v1/locations` — List locations
- `POST /v1/locations` — Create location
- `GET /v1/locations/:id` — Get location
- `PUT /v1/locations/:id` — Update location

### Agent Packs
- `GET /v1/agent-packs/current?location_id=...` — Current deployed pack
- `GET /v1/agent-packs/list?location_id=...` — All versions
- `GET /v1/agent-packs/:id` — Get specific version
- `POST /v1/agent-packs/rollback` — Rollback to version

### Onboarding
- `POST /v1/onboarding/start` — Crawl + generate draft
- `POST /v1/onboarding/confirm` — Apply 5Q answers
- `POST /v1/onboarding/deploy` — Deploy AgentPack

### Calls & Analytics
- `GET /v1/calls` — List calls (filterable by location, date range)
- `GET /v1/calls/:id` — Call detail
- `GET /v1/calls/:id/transcript` — Call transcript
- `GET /v1/analytics/calls` — KPIs + charts

### Webhooks
- `POST /v1/webhooks/retell/inbound` — New inbound call
- `POST /v1/webhooks/retell/events` — Call events (started, ended, tool_call)

## Connecting Real Providers

### Retell (Voice)
1. Sign up at [retell.ai](https://retell.ai)
2. Get API key from dashboard
3. Set `RETELL_API_KEY` in `.env`
4. Configure webhook URL: `https://your-api.com/v1/webhooks/retell/inbound`

### Twilio (SMS)
1. Sign up at [twilio.com](https://twilio.com)
2. Get Account SID + Auth Token
3. Buy a phone number
4. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` in `.env`

### Perplexity (Search)
1. Get API key from [perplexity.ai](https://perplexity.ai)
2. Set `PERPLEXITY_API_KEY` in `.env`

### OpenAI (LLM)
1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Set `OPENAI_API_KEY` in `.env`

## Industry Packs (Seed Data)

The seed script creates 3 demo AgentPacks:

- **HVAC Pack** — Emergency/non-emergency routing, seasonal scheduling, warranty lookup
- **Dental Pack** — New patient intake, insurance verification, emergency dental
- **MedSpa Pack** — Consultation booking, treatment info, contraindication screening

## TODO Backlog (Deferred Features)

### V1 (8-12 weeks)
- [ ] Warm transfer + conference intro
- [ ] Missed-call text-back + callback scheduler
- [ ] Payment link + invoice workflows (`payment_create_link` tool)
- [ ] Dispatch scheduling tool (`dispatch_schedule_job`)
- [ ] QA loop: auto-label failures + weekly improvements + regression tests
- [ ] Multi-location + multi-department routing
- [ ] Simulation + regression test runner (Step F from onboarding)

### V2 (12-24 weeks)
- [ ] Outbound campaigns (callbacks, renewals, collections)
- [ ] Computer-use automation (`ComputerUseAdapter`)
- [ ] Voice biometrics / anti-fraud scoring
- [ ] Multi-agent internal handoffs
- [ ] Telephony reputation engine (STIR/SHAKEN)
- [ ] Knowledge service with pgvector embeddings
- [ ] Billing integration (Stripe subscriptions + metered usage)
- [ ] RBAC fine-grained permissions
- [ ] PII redaction in transcripts

## Tech Stack

- **Frontend**: Next.js 14 + Tailwind CSS + Lucide Icons
- **Backend**: NestJS + TypeORM + Postgres
- **Cache/Queue**: Redis (ready for BullMQ)
- **Auth**: JWT + bcrypt
- **Providers**: Retell, Twilio, Perplexity, OpenAI (all with mock fallbacks)
- **Testing**: Jest
- **Infrastructure**: Docker Compose

## License

Private — All rights reserved.
