import assert from 'node:assert/strict';
import { extractText } from 'unpdf';
import { handler as lambdaHandler } from '../src/lambda.js';
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
    console.log('1. Testing /api/health reports phase 4...');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = (await healthRes.json()) as { phase: number };
    assert.equal(health.phase, 4);

    console.log('2. Creating and analyzing English & Ukrainian audits for PDF tests...');
    const enAuditRes = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleFilename: '01_Predatory_IT_MSA_EN.docx' }),
    });
    assert.equal(enAuditRes.status, 201);
    const enAudit = (await enAuditRes.json()) as { auditId: string; analysis: { overallRiskScore: number } };

    const ukAuditRes = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleFilename: '02_Unfair_FOP_SOW_UK.docx' }),
    });
    assert.equal(ukAuditRes.status, 201);
    const ukAudit = (await ukAuditRes.json()) as { auditId: string };

    console.log('3. Testing 1-Page Executive Summary PDF (English)...');
    const enPdfRes = await fetch(`${baseUrl}/api/audits/${enAudit.auditId}/pdf?lang=en`);
    assert.equal(enPdfRes.status, 200);
    assert.equal(enPdfRes.headers.get('content-type'), 'application/pdf');
    const enPdfBuf = Buffer.from(await enPdfRes.arrayBuffer());
    assert.equal(enPdfBuf.subarray(0, 5).toString('utf-8'), '%PDF-');

    const enParsed = await extractText(new Uint8Array(enPdfBuf), { mergePages: true });
    assert.equal(enParsed.totalPages, 1, 'Executive Summary PDF must be strictly 1 page');
    assert.ok(enParsed.text.includes('NOT LEGAL ADVICE'));
    assert.ok(enParsed.text.includes(`${enAudit.analysis.overallRiskScore}/100`));

    console.log('4. Testing 1-Page Executive Summary PDF (Ukrainian Cyrillic)...');
    const ukPdfRes = await fetch(`${baseUrl}/api/audits/${ukAudit.auditId}/pdf?lang=uk`);
    assert.equal(ukPdfRes.status, 200);
    const ukPdfBuf = Buffer.from(await ukPdfRes.arrayBuffer());
    const ukParsed = await extractText(new Uint8Array(ukPdfBuf), { mergePages: true });
    assert.equal(ukParsed.totalPages, 1, 'Ukrainian Executive Summary PDF must be strictly 1 page');
    assert.ok(ukParsed.text.includes('НЕ Є ЮРИДИЧНОЮ ПОРАДОЮ'));
    assert.ok(ukParsed.text.includes('ЧЕКЛІСТ ДЛЯ ПЕРЕГОВОРІВ'));

    console.log('5. Testing Voluntary Donation & Ukrainian Payment Gateway Abstraction...');
    const configRes = await fetch(`${baseUrl}/api/donations/config`);
    assert.equal(configRes.status, 200);
    const cfg = (await configRes.json()) as { supportedGateways: string[] };
    assert.ok(cfg.supportedGateways.includes('monobank_jar'));
    assert.ok(cfg.supportedGateways.includes('wayforpay'));
    assert.ok(cfg.supportedGateways.includes('liqpay'));

    const mockDonateRes = await fetch(`${baseUrl}/api/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountUah: 200, gateway: 'mock', auditId: enAudit.auditId }),
    });
    assert.equal(mockDonateRes.status, 201);
    const mockDonate = (await mockDonateRes.json()) as { status: string; amountUah: number };
    assert.equal(mockDonate.status, 'completed');
    assert.equal(mockDonate.amountUah, 200);

    const wfpRes = await fetch(`${baseUrl}/api/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountUah: 100, gateway: 'wayforpay' }),
    });
    assert.equal(wfpRes.status, 201);
    const wfp = (await wfpRes.json()) as { gatewayPayload: { merchantSignature: string } };
    assert.ok(wfp.gatewayPayload.merchantSignature.length === 32);

    const liqpayRes = await fetch(`${baseUrl}/api/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountUah: 100, gateway: 'liqpay' }),
    });
    assert.equal(liqpayRes.status, 201);
    const liqpay = (await liqpayRes.json()) as { gatewayPayload: { data: string; signature: string } };
    assert.ok(liqpay.gatewayPayload.data.length > 10);
    assert.ok(liqpay.gatewayPayload.signature.length > 10);

    console.log('6. Testing AWS Lambda HTTP API v2 Adapter (src/lambda.ts)...');
    const apiGwEvent = {
      version: '2.0',
      routeKey: 'GET /api/health',
      rawPath: '/api/health',
      rawQueryString: '',
      headers: { host: 'example.execute-api.us-east-1.amazonaws.com' },
      requestContext: {
        http: {
          method: 'GET',
          path: '/api/health',
          protocol: 'HTTP/1.1',
          sourceIp: '127.0.0.1',
          userAgent: 'phase4-test',
        },
      },
      isBase64Encoded: false,
    };
    const lambdaRes = (await lambdaHandler(apiGwEvent, {})) as {
      statusCode: number;
      body: string;
    };
    assert.equal(lambdaRes.statusCode, 200);
    const lambdaBody = JSON.parse(lambdaRes.body) as { status: string; phase: number };
    assert.equal(lambdaBody.status, 'ok');
    assert.equal(lambdaBody.phase, 4);

    console.log('\nALL PHASE 4 TESTS PASSED!');
  } finally {
    server.close();
    await resetDailyCapForDate();
  }
}

runTests().catch((err) => {
  console.error('Phase 4 test failed:', err);
  process.exit(1);
});
