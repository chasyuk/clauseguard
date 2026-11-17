# ClauseGuard — User Validation & Feedback Report

> **Rubric Alignment (4 points):** *Who you showed it to, how many people tried it, what they said, and what you changed because of it.*

---

## 1. Product Validation Plan (From `one page pitch.pdf`)
- **Target Segment 1:** Ukrainian IT Freelancers (FOP Group 3 — developers, designers, QA contractors signing 1–3 B2B agreements/quarter).
- **Target Segment 2:** Boutique Digital Agencies (3–15 people signing 3–8 client contracts/month without in-house counsel).
- **Channels:** DOU community, Telegram FOP/freelancer chats, direct LinkedIn outreach to boutique agency founders.

---

## 2. Internal Iteration Log (Pre-Launch Design & UX Revisions Completed)

Before external user sessions, the team conducted internal UX and design reviews of the early prototype and made the following concrete changes:

1. **Removed Paywall Friction in Favor of 100% Free Access + Voluntary Monobank Jar Donation**
   - *Feedback:* A hard 200 UAH paywall before seeing results creates abandonment for first-time FOP freelancers testing the tool.
   - *Change Made:* Removed the paywall gate completely and replaced it with a non-blocking **Optional Donation** modal configurable via `VITE_MONOBANK_JAR_URL` (`backend/src/donation/donationProvider.ts` + `frontend/src/components/DonationModal.tsx`).
2. **Eliminated Generic AI Styling & Added 3-Step Clarity + Real Live Specimen**
   - *Feedback:* Early rounded cards, blue gradients, and raw developer filenames (e.g., `01_Predatory_IT_MSA_EN.docx`) felt generic and were unclear to non-technical users.
   - *Change Made:* Switched to a sharp `0px`-radius archival paper + forest-green editorial theme, added a `01 -> 02 -> 03` workflow strip, and placed an interactive 3-column specimen directly on the home screen (`frontend/src/components/LiveClauseSpecimen.tsx`).
3. **Added Strict Scanned-PDF Rejection & 1-Page Executive Summary PDF**
   - *Feedback:* Uploading image-only PDFs without OCR previously triggered obscure parser errors, and users needed a concise sheet to review before client calls.
   - *Change Made:* Added clear localized `SCANNED_PDF_DETECTED` error banners (`422`) and a dedicated 1-page A4 Executive Summary PDF export supporting Ukrainian Cyrillic and English (`backend/src/pdf/executiveSummaryPdf.ts`).
4. **Pivot After Product Critique: Vetted Clause Registry, AI Contract Builder & Context-Aware SOW Auditor**
   - *Feedback Received:*
     1. *"Overall, it is not clear how this differs from just asking Claude (or any other general AI assistant)."*
     2. *"Much stronger as a set of templates for typical contracts, and even better as an AI contract builder: you describe your requirements in plain text, and the contract is assembled from standard, vetted clauses."*
     3. *"Take an SOW: the hard part is checking it against the context of the project (what was actually agreed, scope, deadlines). Without that context, reviewing the text alone adds little."*
   - *Changes Made:*
     - Built a deterministic **Vetted Clause Registry** (`backend/src/builder/clauseRegistry.ts`) containing **16 pre-vetted B2B clauses (`[VETTED-*]`)** with Ukrainian FOP Group 3 / NBU Law No. 1724-VIII guardrails and **4 standard contract templates** (`TPL-FOP-SOW-FIXED`, `TPL-FOP-MSA`, `TPL-SOW-TM`, `TPL-MUTUAL-NDA`).
     - Added an **AI Contract & SOW Builder** (`backend/src/builder/contractBuilder.ts`, `contractExport.ts`, `frontend/src/components/ContractBuilderView.tsx`) that extracts structured deal terms from plain text, detects omitted safeguards (`omittedWarnings`), assembles contracts strictly from vetted modules (never raw LLM prose), lets users toggle `CONTRACTOR_PROTECTIVE` vs `BALANCED` clause variants, and exports ready `.docx` and Unicode `.pdf` agreements.
     - Upgraded the Auditor into a **Context-Aware SOW Reconciliation Engine** (`backend/src/ai/localAnalyzer.ts`, `prompt.ts`, `schema.ts`, `UploadZone.tsx`, `ResultsView.tsx`) that compares written SOW/MSA clauses against the user's actual agreed scope, timeline/deadlines, payment split, and exclusions, outputting a `MISMATCH` / `OMITTED_IN_CONTRACT` / `MATCH` discrepancy matrix with copyable amendments.
     - Added a clear 3-pillar **"Why Use ClauseGuard Instead of a General AI Chatbot"** comparison strip and a browsable **Templates & Vetted Clause Library** (`ClauseLibraryView.tsx`) on the landing workspace.

---

## 3. External User Testing Log (Record Real Sessions Below Before Submission)

> **Instructions for Team (Polina Zuzuk, Maryana Moroz, Oleksandr Vlasyuk):** Share your deployed HTTPS link with **3–5 real Ukrainian IT freelancers (FOP) or agency founders**, observe them testing a real or sample contract, and fill in the actual counts and quotes below.

- **Total people shown to:** `_TBD (fill after testing)_`
- **Total people who uploaded/tested a contract:** `_TBD_`
- **Live testing period:** `_TBD_`

| # | User Role (e.g. FOP Backend Dev / Agency Founder) | Contract Tested | What They Said (Direct Observation) | What We Changed Because of It |
| :--- | :--- | :--- | :--- | :--- |
| 1 | *e.g., FOP Group 3 Senior QA* | *Real MSA / Sample UK* | *[Record actual quote/observation]* | *[Record concrete change or "No change needed"]* |
| 2 | *e.g., Boutique Agency Founder (8 ppl)* | | | |
| 3 | *e.g., Freelance UI/UX Designer* | | | |
