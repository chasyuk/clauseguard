# ClauseGuard — B2B Contract Studio & AI Risk Auditor

**ClauseGuard** is a serverless B2B contract platform built on **AWS** for independent IT contractors (including Ukrainian FOP Group 3 freelancers) and boutique digital agencies (3–15 people). It combines three integrated workflows powered by **Amazon Bedrock (`eu.amazon.nova-lite-v1:0`)**:

1. **Context-Aware SOW & Chat Reconciliation** — Cross-references informal deal agreements from Slack/Telegram/Upwork against the formal Statement of Work (SOW) to catch hidden scope creep, shortened deadlines, reduced budgets, and unagreed penalties, generating ready-to-send diplomatic counter-replies.
2. **AI Contract Builder & Vetted Clause Registry** — Assembles balanced B2B contracts (`Fixed-Price SOW`, `FOP Group 3 MSA`, `Time & Materials SOW`, `Mutual B2B NDA`) from lawyer-vetted modular clauses in Ukrainian, English, or Bilingual (`UA + EN`) with configurable negotiation posture and instant `.docx` & `.pdf` export.
3. **Direct Contract File Audit (`.docx` & `.pdf`)** — Extracts clauses, evaluates commercial traps via Amazon Bedrock with 1x JSON schema retry and deterministic fallback, generates 2-sentence plain-language summaries, copyable counter-clauses, and a 1-page Executive Summary PDF.

- **Live Demo (HTTPS via AWS CloudFront):** [https://d3clnevtf6tq79.cloudfront.net](https://d3clnevtf6tq79.cloudfront.net)
- **AWS API Gateway Endpoint:** `https://6m3h2016l8.execute-api.eu-central-1.amazonaws.com/prod`

---

## Repository Structure

```text
ClauseGuard/
├── backend/                  # Node.js 22 + TypeScript Serverless API (Express + AWS Lambda adapter)
│   ├── assets/fonts/         # Bundled Unicode fonts for Cyrillic & English PDF generation
│   ├── scripts/              # Sample generator + Phase 1–5 automated verification suites
│   └── src/
│       ├── ai/               # System prompt, Zod schema, Bedrock Nova Lite invoker & fallback analyzer
│       ├── auth/             # Email Sign-Up/Sign-In (scrypt + HMAC-SHA256 JWT) & Google OAuth2
│       ├── builder/          # Vetted Clause Registry (16 clauses, 4 templates), AI Builder & DOCX/PDF exporter
│       ├── donation/         # Voluntary support & payment gateway adapters (Monobank Jar, WayForPay, LiqPay)
│       ├── extraction/       # Magic-byte validation, mammoth (.docx), unpdf (.pdf), clause splitter
│       ├── pdf/              # 1-page Executive Summary PDF generator (pdf-lib + fontkit)
│       └── storage/          # AWS DynamoDB (users, audits, daily quota) + S3 (encrypted 24h uploads)
├── frontend/                 # React 18 + TypeScript + Vite + Tailwind CSS (EN/UA i18n)
├── infra/                    # AWS SAM / CloudFormation template & automated deploy script
├── samples/                  # Sample B2B contracts (.docx / .pdf) for instant testing
├── examples/                 # Realistic FOP & MSA sample contracts
├── USER_FEEDBACK_REPORT.md   # User testing log & iteration report
└── README.md
```

---

## AWS Serverless Architecture

All user authentication, AI contract analysis, SOW reconciliation, and contract assembly run through AWS (`eu-central-1`):

- **Amazon CloudFront + S3** — Hosts the React SPA over HTTPS with Origin Access Control.
- **Amazon API Gateway (HTTP API) + AWS Lambda (`nodejs22.x` ARM64)** — Serves all REST endpoints (`/api/auth/*`, `/api/reconcile`, `/api/builder/*`, `/api/extract`, `/api/audits/*`, `/api/my-audits`).
- **Amazon Bedrock (`eu.amazon.nova-lite-v1:0`)** — Performs context-aware SOW discrepancy detection, contract risk auditing, and natural-language parameter extraction for the AI Contract Builder.
- **Amazon DynamoDB (`On-Demand` + TTL)** — Stores registered user accounts (Email & Google OAuth), audit records, and daily AI quota counters with automatic 24-hour TTL expiration on contract audits.
- **Amazon S3 (`SSE-S3` + 24h Lifecycle Rule)** — Temporarily stores uploaded contracts encrypted at rest and automatically purges them after 24 hours.
- **AWS Budgets** — Enforces a $2.00/month cost alert threshold alongside the hard `DAILY_AUDIT_CAP` in DynamoDB.

---

## Running Locally

### Prerequisites
- **Node.js 20+ / 22+** (`node -v`)
- **npm 10+** (`npm -v`)

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Run Automated Test Suites (Phases 1–5)
```bash
npm run test:all
```

### 3. Start Local Development Servers
Open two terminals in the repository root:

**Terminal 1 — Backend API (`http://localhost:3001`):**
```bash
npm run dev:backend
```

**Terminal 2 — Frontend UI (`http://localhost:5173`):**
```bash
npm run dev:frontend
```

---

## Deploying to AWS

### Prerequisites
1. Configure AWS CLI credentials with permissions for CloudFormation, Lambda, API Gateway, DynamoDB, S3, CloudFront, and Bedrock:
   ```bash
   aws configure
   ```
2. Ensure **Amazon Nova Lite (`eu.amazon.nova-lite-v1:0` / `amazon.nova-lite-v1:0`)** is available in Amazon Bedrock in your target region (`eu-central-1` or `us-east-1`).

### One-Command Full Deployment
```bash
AWS_REGION=eu-central-1 \
BEDROCK_MODEL_ID=eu.amazon.nova-lite-v1:0 \
GOOGLE_CLIENT_ID=<your-google-oauth-client-id> \
bash infra/deploy.sh
```

The script compiles the TypeScript backend, packages the Lambda bundle, deploys the CloudFormation stack (`infra/template.yaml`), builds the Vite frontend with `VITE_API_URL` pointing to the deployed API Gateway endpoint, uploads static assets to S3, and invalidates the CloudFront distribution cache.
