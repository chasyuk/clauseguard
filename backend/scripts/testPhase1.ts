import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLES_DIR = path.resolve(__dirname, '../../samples');

async function runTests() {
  const app = createApp();
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind ephemeral port for tests.');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    console.log('1. Testing /api/health...');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = (await healthRes.json()) as { status: string; phase: number };
    assert.equal(health.status, 'ok');
    assert.ok(health.phase >= 1);

    console.log('2. Testing Auth Sign-Up & Sign-In...');
    const testEmail = `tester-${Date.now()}@clauseguard.ua`;
    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Oleksandr FOP', email: testEmail, password: 'password123' }),
    });
    assert.equal(signupRes.status, 201);
    const signupData = (await signupRes.json()) as { token: string; user: { email: string } };
    assert.ok(signupData.token);
    assert.equal(signupData.user.email, testEmail);

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'password123' }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = (await loginRes.json()) as { token: string };
    assert.ok(loginData.token);

    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    assert.equal(meRes.status, 200);

    console.log('3. Testing multipart .docx upload (01_Predatory_IT_MSA_EN.docx)...');
    const enDocx = await fs.readFile(path.join(SAMPLES_DIR, '01_Predatory_IT_MSA_EN.docx'));
    const formEn = new FormData();
    formEn.append(
      'file',
      new Blob([enDocx], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      '01_Predatory_IT_MSA_EN.docx',
    );
    const enRes = await fetch(`${baseUrl}/api/extract`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginData.token}` },
      body: formEn,
    });
    assert.equal(enRes.status, 201);
    const enRecord = (await enRes.json()) as {
      auditId: string;
      language: string;
      clauses: { clauseNumber: string; text: string }[];
    };
    assert.equal(enRecord.language, 'en');
    assert.ok(enRecord.clauses.length >= 6, `Expected >= 6 clauses, got ${enRecord.clauses.length}`);

    console.log('4. Testing Ukrainian .docx extraction (02_Unfair_FOP_SOW_UK.docx)...');
    const ukDocx = await fs.readFile(path.join(SAMPLES_DIR, '02_Unfair_FOP_SOW_UK.docx'));
    const formUk = new FormData();
    formUk.append('file', new Blob([ukDocx]), '02_Unfair_FOP_SOW_UK.docx');
    const ukRes = await fetch(`${baseUrl}/api/extract`, { method: 'POST', body: formUk });
    assert.equal(ukRes.status, 201);
    const ukRecord = (await ukRes.json()) as {
      language: string;
      clauses: { clauseNumber: string; text: string }[];
    };
    assert.equal(ukRecord.language, 'uk');
    assert.ok(ukRecord.clauses.length >= 6, `Expected >= 6 clauses, got ${ukRecord.clauses.length}`);

    console.log('5. Testing bilingual digital PDF extraction (03_Mixed_NDA_Service.pdf)...');
    const mixedPdf = await fs.readFile(path.join(SAMPLES_DIR, '03_Mixed_NDA_Service.pdf'));
    const formMixed = new FormData();
    formMixed.append('file', new Blob([mixedPdf], { type: 'application/pdf' }), '03_Mixed_NDA_Service.pdf');
    const mixedRes = await fetch(`${baseUrl}/api/extract`, { method: 'POST', body: formMixed });
    assert.equal(mixedRes.status, 201);
    const mixedRecord = (await mixedRes.json()) as {
      language: string;
      pageCount: number;
      clauses: { clauseNumber: string }[];
    };
    assert.ok(mixedRecord.pageCount >= 1);
    assert.ok(mixedRecord.clauses.length >= 4);
    assert.equal(mixedRecord.language, 'mixed');

    console.log('6. Testing Scanned / Image-Only PDF rejection (04_Scanned_Image_Only_Test.pdf)...');
    const scannedPdf = await fs.readFile(path.join(SAMPLES_DIR, '04_Scanned_Image_Only_Test.pdf'));
    const formScanned = new FormData();
    formScanned.append('file', new Blob([scannedPdf], { type: 'application/pdf' }), '04_Scanned_Image_Only_Test.pdf');
    const scannedRes = await fetch(`${baseUrl}/api/extract`, { method: 'POST', body: formScanned });
    assert.equal(scannedRes.status, 422);
    const scannedErr = (await scannedRes.json()) as { error: string };
    assert.equal(scannedErr.error, 'SCANNED_PDF_DETECTED');

    console.log('7. Testing >10 MB file rejection...');
    const bigBuf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(10 * 1024 * 1024 + 512, 0x20)]);
    const formBig = new FormData();
    formBig.append('file', new Blob([bigBuf], { type: 'application/pdf' }), 'too_large.pdf');
    const bigRes = await fetch(`${baseUrl}/api/extract`, { method: 'POST', body: formBig });
    assert.equal(bigRes.status, 413);
    const bigErr = (await bigRes.json()) as { error: string };
    assert.equal(bigErr.error, 'FILE_TOO_LARGE');

    console.log('8. Testing unsupported file type rejection (.txt)...');
    const formTxt = new FormData();
    formTxt.append('file', new Blob(['hello contract'], { type: 'text/plain' }), 'contract.txt');
    const txtRes = await fetch(`${baseUrl}/api/extract`, { method: 'POST', body: formTxt });
    assert.equal(txtRes.status, 415);
    const txtErr = (await txtRes.json()) as { error: string };
    assert.equal(txtErr.error, 'UNSUPPORTED_FILE_TYPE');

    console.log('9. Testing GET /api/audits/:auditId retrieval...');
    const auditGetRes = await fetch(`${baseUrl}/api/audits/${enRecord.auditId}`);
    assert.equal(auditGetRes.status, 200);

    console.log('\nALL PHASE 1 BACKEND TESTS PASSED!');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Phase 1 test failed:', err);
  process.exit(1);
});
