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
