import assert from 'node:assert/strict';
import { createApp } from '../src/index.js';
import { resetDailyCapForDate } from '../src/storage/auditStore.js';

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
    console.log('1. Testing /api/health reports phase 3...');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = (await healthRes.json()) as { phase: number };
    assert.ok(health.phase >= 3);

    console.log('2. Testing authenticated user audit creation + /api/my-audits history...');
    const email = `phase3-${Date.now()}@clauseguard.ua`;
    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Maryana Agency', email, password: 'secret123' }),
    });
    assert.equal(signupRes.status, 201);
    const { token } = (await signupRes.json()) as { token: string };

    // Anonymous /api/my-audits should be rejected
    const unauthHistoryRes = await fetch(`${baseUrl}/api/my-audits`);
    assert.equal(unauthHistoryRes.status, 401);

    // Create and analyze a sample contract under the authenticated user
    const auditRes = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sampleFilename: '02_Unfair_FOP_SOW_UK.docx' }),
    });
    assert.equal(auditRes.status, 201);
    const createdAudit = (await auditRes.json()) as {
      auditId: string;
      userId: string;
      analysis: {
        overallRiskScore: number;
        flaggedClauses: {
          clauseNumber: string;
          category: string;
          riskLevel: string;
          originalExcerpt: string;
          plainLanguageSummary: string;
          counterClause: string;
        }[];
      };
      analysisMeta: { riskCounts: { high: number; medium: number; low: number } };
    };
    assert.ok(createdAudit.userId);
    assert.ok(createdAudit.analysis.flaggedClauses.length >= 5);

    const myAuditsRes = await fetch(`${baseUrl}/api/my-audits`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(myAuditsRes.status, 200);
    const myAudits = (await myAuditsRes.json()) as {
      audits: { auditId: string; fileName: string; overallRiskScore: number }[];
    };
    assert.equal(myAudits.audits.length, 1);
    assert.equal(myAudits.audits[0].auditId, createdAudit.auditId);
    assert.equal(myAudits.audits[0].fileName, '02_Unfair_FOP_SOW_UK.docx');

    console.log('3. Testing shareable one-time UUID link retrieval without auth...');
    const shareRes = await fetch(`${baseUrl}/api/audits/${createdAudit.auditId}`);
    assert.equal(shareRes.status, 200);
    const shared = (await shareRes.json()) as typeof createdAudit;
    assert.equal(shared.auditId, createdAudit.auditId);
    assert.equal(shared.analysis.overallRiskScore, createdAudit.analysis.overallRiskScore);

    console.log('4. Testing missing/expired UUID returns 404 AUDIT_NOT_FOUND...');
    const missingRes = await fetch(`${baseUrl}/api/audits/00000000-0000-0000-0000-000000000000`);
    assert.equal(missingRes.status, 404);
    const missingBody = (await missingRes.json()) as { error: string };
    assert.equal(missingBody.error, 'AUDIT_NOT_FOUND');

    console.log('\nALL PHASE 3 TESTS PASSED!');
  } finally {
    server.close();
    await resetDailyCapForDate();
  }
}

runTests().catch((err) => {
  console.error('Phase 3 test failed:', err);
  process.exit(1);
});
