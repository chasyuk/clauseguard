import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractText } from 'unpdf';
import { authenticateWithGoogleIdToken } from '../src/auth/authService.js';
import { createApp } from '../src/index.js';
import { resetDailyCapForDate } from '../src/storage/auditStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLES_DIR = path.resolve(__dirname, '../../samples');

async function runTests() {
  await resetDailyCapForDate();
  const app = createApp();
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind ephemeral port.');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    console.log('1. Testing GET /api/builder/templates returns 4 templates & 16 vetted clauses...');
    const tplRes = await fetch(`${baseUrl}/api/builder/templates`);
    assert.equal(tplRes.status, 200);
    const catalog = (await tplRes.json()) as {
      templates: Array<{ templateId: string }>;
      clauses: Array<{ clauseId: string }>;
      scenarios: Array<{ id: string }>;
    };
    assert.equal(catalog.templates.length, 4);
    assert.equal(catalog.clauses.length, 16);
    assert.equal(catalog.scenarios.length, 3);

    console.log('2. Testing POST /api/builder/assemble detects omitted safeguards & injects vetted modules...');
    const messyPrompt =
      'Need a contract for building a Telegram e-commerce mini-app for BrightStore LLC for $3,200 EUR, deadline November 30, hourly rate 45 EUR for extras.';
    const assembleRes = await fetch(`${baseUrl}/api/builder/assemble`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plainTextRequirements: messyPrompt,
        contractLanguage: 'bilingual',
        posture: 'CONTRACTOR_PROTECTIVE',
      }),
    });
    assert.equal(assembleRes.status, 200);
    const assembled = (await assembleRes.json()) as {
      templateId: string;
      parameters: { currency: string; hourlyRate: string };
      omittedWarnings: Array<{ appliedDefaultClauseId: string }>;
      sections: Array<{ selectedClauseId: string; alternatives: Array<{ clauseId: string }> }>;
      fullContractText: string;
    };
    assert.equal(assembled.templateId, 'TPL-FOP-SOW-FIXED');
    assert.equal(assembled.parameters.currency, 'EUR');
    assert.ok(assembled.omittedWarnings.length >= 3, 'Should warn about missing exclusions, acceptance SLA, and liability cap');
    assert.equal(assembled.sections.length, 8);
    assert.ok(assembled.sections.every((s) => s.selectedClauseId.startsWith('VETTED-')));
    assert.ok(assembled.fullContractText.includes('[EN Translation]'));

    console.log('3. Testing POST /api/builder/export/docx...');
    const docxRes = await fetch(`${baseUrl}/api/builder/export/docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assembled),
    });
    assert.equal(docxRes.status, 200);
    assert.equal(
      docxRes.headers.get('content-type'),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    const docxBuf = Buffer.from(await docxRes.arrayBuffer());
    assert.equal(docxBuf.subarray(0, 2).toString('utf-8'), 'PK');
    assert.ok(docxBuf.length > 2000);

    console.log('4. Testing POST /api/builder/export/pdf (Unicode Cyrillic + Latin)...');
    const ukAssembleRes = await fetch(`${baseUrl}/api/builder/assemble`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plainTextRequirements:
          'Замовник: NordPay Fintech GmbH. Виконавець: ФОП Іван Петренко. Проєкт: SaaS кабінет, ціна 6000 USD, передоплата 40%, оплата 10 днів.',
        contractLanguage: 'uk',
      }),
    });
    assert.equal(ukAssembleRes.status, 200);
    const ukAssembled = await ukAssembleRes.json();

    const pdfRes = await fetch(`${baseUrl}/api/builder/export/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ukAssembled),
    });
    assert.equal(pdfRes.status, 200);
    assert.equal(pdfRes.headers.get('content-type'), 'application/pdf');
    const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
    assert.equal(pdfBuf.subarray(0, 5).toString('utf-8'), '%PDF-');
    const parsedPdf = await extractText(new Uint8Array(pdfBuf), { mergePages: true });
    assert.ok(parsedPdf.text.includes('NordPay'));
    assert.ok(parsedPdf.text.includes('VETTED-'));

    console.log('5. Testing Context-Aware SOW Discrepancy Matrix on Sample 01...');
    const ctxAuditRes = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleFilename: '01_Predatory_IT_MSA_EN.docx',
        dealContext: {
          agreedScope: 'Custom React/Node SaaS portal MVP (Auth, Billing)',
          agreedTimeline: '6-week delivery with 5-day client feedback SLA',
          agreedPayment: '$8,500 USD (40% upfront, Net 14 calendar days)',
          agreedExclusions: 'Pre-existing UI libraries stay with Contractor; DevOps excluded',
        },
      }),
    });
    assert.equal(ctxAuditRes.status, 201);
    const ctxAudit = (await ctxAuditRes.json()) as {
      analysis: {
        contextAlignmentScore: number;
        contextDiscrepancies: Array<{ dimension: string; status: string }>;
        flaggedClauses: Array<{ vettedClauseId?: string }>;
      };
    };
    assert.ok(ctxAudit.analysis.contextAlignmentScore < 80);
    const payMismatch = ctxAudit.analysis.contextDiscrepancies.find(
      (d) => d.dimension === 'PAYMENT_AND_MILESTONES',
    );
    assert.equal(payMismatch?.status, 'MISMATCH');
    assert.ok(ctxAudit.analysis.flaggedClauses.every((f) => f.vettedClauseId?.startsWith('VETTED-')));

    console.log('6. Testing multipart FormData upload with Ukrainian dealContext...');
    const ukDocx = await fs.readFile(path.join(SAMPLES_DIR, '02_Unfair_FOP_SOW_UK.docx'));
    const form = new FormData();
    form.append(
      'file',
      new Blob([ukDocx], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      '02_Unfair_FOP_SOW_UK.docx',
    );
    form.append(
      'dealContext',
      JSON.stringify({
        agreedScope: 'Розробка CRM інтеграції за погодженим ТЗ',
        agreedPayment: 'Передоплата 50% та фінал 10 днів',
        agreedExclusions: 'Власні бібліотеки залишаються за ФОП',
      }),
    );

    const ukMultipartRes = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      body: form,
    });
    assert.equal(ukMultipartRes.status, 201);
    const ukAudit = (await ukMultipartRes.json()) as {
      analysis: { contextDiscrepancies: Array<{ status: string }> };
    };
    assert.ok(ukAudit.analysis.contextDiscrepancies.some((d) => d.status === 'MISMATCH'));

    console.log('7. Testing Google OAuth config endpoint & Google ID token account creation/login...');
    const authCfgRes = await fetch(`${baseUrl}/api/auth/config`);
    assert.equal(authCfgRes.status, 200);
    const authCfg = (await authCfgRes.json()) as { googleEnabled: boolean };
    assert.equal(typeof authCfg.googleEnabled, 'boolean');

    const googleAuth1 = await authenticateWithGoogleIdToken('mock-google-id-token', async () => ({
      email: 'fop.google.user@example.com',
      email_verified: true,
      name: 'Google FOP Dev',
      iss: 'https://accounts.google.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    assert.equal(googleAuth1.user.email, 'fop.google.user@example.com');
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${googleAuth1.token}` },
    });
    assert.equal(meRes.status, 200);
    const meJson = (await meRes.json()) as { user: { id: string } };
    assert.equal(meJson.user.id, googleAuth1.user.id);

    const googleAuth2 = await authenticateWithGoogleIdToken('mock-google-id-token-2', async () => ({
      email: 'fop.google.user@example.com',
      email_verified: 'true',
      name: 'Google FOP Dev',
      iss: 'accounts.google.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    assert.equal(googleAuth2.user.id, googleAuth1.user.id);

    console.log('\nALL PHASE 5 TESTS PASSED!');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Phase 5 test failed:', err);
  process.exit(1);
});
