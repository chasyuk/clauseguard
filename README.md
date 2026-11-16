# ClauseGuard — AI B2B Contract Risk Auditor (v1 MVP)

**ClauseGuard** helps Ukrainian IT freelancers (FOP Group 3) and boutique digital agencies (3–15 people) audit B2B service agreements (MSAs, NDAs, SOWs) in under 60 seconds, flag commercial traps, read 2-sentence plain-language summaries, copy balanced counter-clauses, and download a 1-page Executive Summary PDF.

- **100% Free to Use** — No paywall. Voluntary support via a configurable Monobank Jar link (plus built-in gateway adapters for WayForPay and LiqPay).
- **Privacy First** — No paid OCR, encrypted at rest (SSE-S3 + DynamoDB encryption), 24-hour automatic deletion via S3 lifecycle & DynamoDB TTL, and zero contract text logged.
- **Disclaimer:** ClauseGuard is an automated risk-screening tool and does not provide legal advice.

---

## Repository Structure

```text
ClauseGuard/
├── backend/                  # Node.js 20 + TypeScript API (Express + AWS Lambda adapter)
│   ├── assets/fonts/         # Bundled Unicode fonts for Cyrillic & English 1-page PDF export
│   ├── scripts/              # Sample generator + Phase 1–4 automated test suites
│   └── src/
│       ├── ai/               # System prompt, Zod schema, 1x JSON retry, Bedrock & fallback engine
│       ├── auth/             # Sign-up & Sign-in (scrypt password hash + HMAC-SHA256 JWT)
│       ├── donation/         # Voluntary donation abstraction (Mock, Monobank, WayForPay, LiqPay)
│       ├── extraction/       # Magic-byte validation, mammoth (.docx), unpdf (.pdf), clause splitter
│       ├── pdf/              # 1-page Executive Summary PDF generator (pdf-lib + fontkit)
│       └── storage/          # Dual-mode store: DynamoDB + S3 in AWS / JSON locally
├── frontend/                 # React 18 + Vite + Tailwind CSS (0px archival theme, EN/UA i18n)
├── infra/                    # AWS SAM template (API Gateway, Lambda, S3 24h TTL, DynamoDB, Budget)
├── samples/                  # 3 risky sample contracts (.docx/.pdf) + 1 scanned-PDF test file
├── USER_FEEDBACK_REPORT.md   # User validation log & changelog template (4-point rubric)
└── README.md
```

---

## Running Locally (Zero AWS Account Required)

### Prerequisites
- **Node.js 20+** (`node -v`)
- **npm 10+** (`npm -v`)

### 1. Install All Dependencies
```bash
npm run install:all
```

### 2. Run All Automated Verification Suites (Phases 1–4)
```bash
npm run test:all
```

### 3. Start Backend & Frontend
Open **two terminal tabs** in the project root:

**Terminal 1 (Backend on `http://localhost:3001`):**
```bash
npm run dev:backend
```

**Terminal 2 (Frontend on `http://localhost:5173`):**
```bash
npm run dev:frontend
```

Open **`http://localhost:5173`** in your browser.
- When AWS credentials are not configured locally, the backend automatically switches to `local_fallback` so you can test the entire UI, risk flags, counter-clauses, and 1-page PDF download for free.
- To test against **live Amazon Bedrock** locally, configure `aws configure` and run:
  ```bash
  BEDROCK_MODE=bedrock AWS_REGION=us-east-1 BEDROCK_MODEL_ID=amazon.nova-lite-v1:0 npm run dev:backend
  ```

---

## Deploying to AWS (Step-by-Step Beginner Guide)

ClauseGuard runs 100% serverless inside AWS Free Tier / Free Credits (no NAT gateways, no RDS, no EC2 servers).

### Step 1: Install Prerequisites
1. Create an **IAM User** in AWS Console (`IAM → Users → Create user`), attach `AdministratorAccess` (for SAM deployment), create a CLI access key, and run:
   ```bash
   aws configure
   ```
   (Set default region to `us-east-1` or `eu-central-1`.)
2. Install the **AWS SAM CLI**: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
3. In the AWS Console, open **Amazon Bedrock → Model access** in your chosen region and confirm **Amazon Nova Lite (`amazon.nova-lite-v1:0`)** is enabled.

### Step 2: Deploy Backend + Storage + Budget Alarm (1 Command)
```bash
cd infra
sam build
sam deploy --guided
```
During `--guided`:
- Stack Name: `clauseguard-mvp`
- AWS Region: `us-east-1` (or `eu-central-1`)
- `BedrockModelId`: `amazon.nova-lite-v1:0` (swap anytime via 1 environment variable)
- `DailyAuditCap`: `50` (hard cap on daily audits to protect your credits)
- `BudgetAlertEmail`: your email address (triggers a $2.00/month cost alarm)
- `JwtSecret`: any long random string

SAM prints **`ApiEndpoint`** at the end (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com/prod`).

### Step 3: Deploy Frontend over HTTPS (AWS Amplify Hosting)
1. Push this repository to GitHub/GitLab.
2. Open **AWS Amplify Console → Create new app → Host web app**.
3. Select the repository and set **App root directory** to `frontend`.
4. Add environment variables in Amplify:
   - `VITE_API_URL` = your SAM `ApiEndpoint` URL (no trailing slash)
   - `VITE_MONOBANK_JAR_URL` = your real Monobank Jar URL (`https://send.monobank.ua/jar/...`)
5. Deploy — Amplify gives you an instant HTTPS URL (`https://main.<app-id>.amplifyapp.com`).

---

## Cost & Guardrails Summary
- **Amazon Bedrock (`amazon.nova-lite-v1:0`):** ~$0.0008 per 10-page contract (~6.5K input + 1.8K output tokens).
- **AWS Lambda, API Gateway HTTP API, DynamoDB On-Demand, S3 (24h auto-delete), Amplify:** Covered within AWS Free Tier limits for MVP traffic.
- **Cost Protections:** `DAILY_AUDIT_CAP=50`, API Gateway throttling (`2 req/s`, burst `5`), S3 24h expiration rule, and a $2.00 monthly AWS Budget alarm.

---

## Plugging In Real Ukrainian Payment Gateways (WayForPay / LiqPay / Monobank)
1. **Monobank Jar (Active & Configurable):** Set `VITE_MONOBANK_JAR_URL` in `frontend/.env` and `MONOBANK_JAR_URL` in SAM parameters.
2. **WayForPay / LiqPay (`backend/src/donation/donationProvider.ts`):** Ready-to-use HMAC-MD5 (`buildWayForPayDonationPayload`) and SHA-1 Base64 (`buildLiqPayDonationPayload`) checkout payload builders are already implemented. Set `WAYFORPAY_MERCHANT_ACCOUNT` + `WAYFORPAY_SECRET_KEY` or `LIQPAY_PUBLIC_KEY` + `LIQPAY_PRIVATE_KEY` in Lambda environment variables and switch the frontend donation request gateway from `'mock'` to `'wayforpay'` or `'liqpay'`.
