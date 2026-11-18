import fs from 'node:fs/promises';
import path from 'node:path';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AnalysisError, analyzeContractClauses } from './ai/analyzeContract.js';
import { SYSTEM_PROMPT } from './ai/prompt.js';
import { DealContext, DealContextSchema, hasDealContext } from './ai/schema.js';
import {
  AuthError,
  authenticateWithGoogleIdToken,
  loginUser,
  signUpUser,
  verifyJwt,
} from './auth/authService.js';
import {
  BUILDER_SCENARIOS,
  ClauseModuleType,
  ClausePosture,
  CONTRACT_TEMPLATES,
  ContractParameters,
  MODULE_TITLES,
  VETTED_CLAUSES,
} from './builder/clauseRegistry.js';
import { assembleContractFromPlainText, BuilderLanguage } from './builder/contractBuilder.js';
import {
  generateAssembledContractDocx,
  generateAssembledContractPdf,
} from './builder/contractExport.js';
import { config } from './config.js';
import { DonationGateway, donationProvider } from './donation/donationProvider.js';
import { ExtractionError } from './extraction/fileValidator.js';
import { processContractUpload } from './extraction/pipeline.js';
import { generateExecutiveSummaryPdf } from './pdf/executiveSummaryPdf.js';
import {
  AuditRecord,
  checkAndIncrementDailyCap,
  getAuditById,
  listAuditsByUserId,
  QuotaError,
  saveAudit,
} from './storage/auditStore.js';

export interface SampleMetadata {
  filename: string;
  labelEn: string;
  labelUk: string;
  descriptionEn: string;
  descriptionUk: string;
  expectedOutcome: 'risky' | 'scanned_error';
  defaultDealContext?: DealContext;
}

const SAMPLE_CATALOG: SampleMetadata[] = [
  {
    filename: '01_Predatory_IT_MSA_EN.docx',
    labelEn: 'English IT MSA (5 Risks + Context Mismatches)',
    labelUk: 'Англомовний IT MSA (5 ризиків + розбіжності скоупу)',
    descriptionEn: 'Unlimited liability, Net 60 pay-when-paid, IP grab, $15k penalty, 24-mo non-compete vs. Net 14 deal notes',
    descriptionUk: 'Необмежена відповідальність, Net 60, IP-пастка, штраф $15k проти погодженого Net 14 та захищених бібліотек',
    expectedOutcome: 'risky',
    defaultDealContext: {
      agreedScope: 'Custom React/Node SaaS portal MVP (Auth, Billing, Admin Console) per approved sprint SOW',
      agreedTimeline: '6-week delivery; 5 business days client review SLA; delays in client assets extend deadline',
      agreedPayment: '$8,500 USD total (40% upfront deposit, Net 14 calendar days unconditionally)',
      agreedExclusions: 'Contractor pre-existing utility libraries, UI templates, and post-launch DevOps support excluded',
    },
  },
  {
    filename: '02_Unfair_FOP_SOW_UK.docx',
    labelEn: 'Ukrainian FOP Contract (5 Risks + Context Mismatches)',
    labelUk: 'Договір ФОП 3 групи (5 ризиків + розбіжності умов)',
    descriptionEn: '60-day payout, pre-payment IP transfer, 5%/day penalty, 3-yr non-compete vs. agreed FOP terms',
    descriptionUk: 'Оплата 60 днів, передача IP до оплати, пеня 5%/день, non-compete 3 роки проти домовлених умов ФОП',
    expectedOutcome: 'risky',
    defaultDealContext: {
      agreedScope: 'Розробка веб-кабінету та REST API інтеграції за узгодженим ТЗ (2 раунди правок)',
      agreedTimeline: '45 календарних днів від дати передоплати; 5 роб. днів на підписання Акта',
      agreedPayment: 'Передоплата 40%, фінальна оплата 10 банківських днів незалежно від кінцевих клієнтів',
      agreedExclusions: 'Власні бібліотеки Виконавця залишаються за ФОП; IP переходить виключно після повної оплати',
    },
  },
  {
    filename: '03_Mixed_NDA_Service.pdf',
    labelEn: 'Bilingual Digital PDF (4 Risks + Context Check)',
    labelUk: 'Двомовний цифровий PDF (4 ризики + контекст)',
    descriptionEn: 'Mixed EN/UK service agreement with $10k penalty, Net 45 & broad IP assignment',
    descriptionUk: 'Змішаний EN/UK договір зі штрафом $10k, Net 45 та широкою передачею IP',
    expectedOutcome: 'risky',
    defaultDealContext: {
      agreedScope: 'Frontend audit + performance optimization deliverables',
      agreedTimeline: '3 weeks delivery with 5-day acceptance check',
      agreedPayment: 'Net 14 days via SWIFT FOP invoice without unilateral holdbacks',
      agreedExclusions: 'Portfolio citation right and pre-existing starter kits remain with Contractor',
    },
  },
  {
    filename: '04_Scanned_Image_Only_Test.pdf',
    labelEn: 'Scanned PDF (OCR Rejection Test)',
    labelUk: 'Скан-копія PDF (тест помилки)',
    descriptionEn: 'Image-only PDF with zero selectable text to verify free scanned-PDF blocking',
    descriptionUk: 'PDF без текстового шару для перевірки блокування платних OCR-сканів',
    expectedOutcome: 'scanned_error',
  },
];

// Accept up to 11 MB in multer so our validator returns a clean JSON 413 FILE_TOO_LARGE above 10 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 11 * 1024 * 1024 },
});

function getOptionalUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const payload = verifyJwt(authHeader.slice(7));
  return payload?.sub ?? null;
}

function parseDealContextFromRequest(
  req: Request,
  sampleDefaultContext?: DealContext,
): DealContext | undefined {
  let rawCtx: unknown = req.body?.dealContext;
  if (typeof rawCtx === 'string' && rawCtx.trim()) {
    const trimmed = rawCtx.trim();
    try {
      rawCtx = JSON.parse(trimmed);
    } catch {
      rawCtx = { rawNotes: trimmed };
    }
  }

  if (rawCtx && typeof rawCtx === 'object') {
    const parsed = DealContextSchema.safeParse(rawCtx);
    if (parsed.success && hasDealContext(parsed.data)) {
      return parsed.data;
    }
  }

  if (sampleDefaultContext && req.body?.useSampleDealContext !== false) {
    return sampleDefaultContext;
  }

  return undefined;
}

async function resolveUploadBuffer(
  req: Request,
): Promise<{ fileName: string; buffer: Buffer; sampleMeta?: SampleMetadata }> {
  const sampleFilename = req.body?.sampleFilename;
  if (typeof sampleFilename === 'string' && sampleFilename.trim()) {
    const safeName = path.basename(sampleFilename.trim());
    const sampleMeta = SAMPLE_CATALOG.find((s) => s.filename === safeName);
    if (!sampleMeta) {
      throw new ExtractionError('UNSUPPORTED_FILE_TYPE', 'Invalid sample filename.', 404);
    }
    const buffer = await fs.readFile(path.join(config.samplesDir, safeName));
    return { fileName: safeName, buffer, sampleMeta };
  }

  if (!req.file) {
    throw new ExtractionError('EMPTY_FILE', 'Please upload a .docx or .pdf contract file.', 400);
  }
  return { fileName: req.file.originalname, buffer: req.file.buffer };
}

async function runAnalysisOnAudit(
  record: AuditRecord,
  dailyCapOverride?: number,
  dealContextOverride?: DealContext,
): Promise<AuditRecord> {
  if (record.analysis) {
    return record;
  }

  const effectiveContext = hasDealContext(dealContextOverride)
    ? dealContextOverride
    : record.dealContext;

  await checkAndIncrementDailyCap(dailyCapOverride ?? config.dailyAuditCap);
  const startMs = Date.now();
  const outcome = await analyzeContractClauses(record.clauses, record.language, {
    dealContext: effectiveContext,
  });

  const flagged = outcome.analysis.flaggedClauses;
  const riskCounts = {
    high: flagged.filter((c) => c.riskLevel === 'HIGH').length,
    medium: flagged.filter((c) => c.riskLevel === 'MEDIUM').length,
    low: flagged.filter((c) => c.riskLevel === 'LOW').length,
  };

  const updated: AuditRecord = {
    ...record,
    ...(hasDealContext(effectiveContext) ? { dealContext: effectiveContext } : {}),
    analysis: outcome.analysis,
    analysisMeta: {
      provider: outcome.provider,
      modelId: outcome.modelId,
      attempts: outcome.attempts,
      analyzedAt: new Date().toISOString(),
      durationMs: Date.now() - startMs,
      riskCounts,
    },
  };

  await saveAudit(updated);

  // Privacy-safe log: counts and timings only, zero contract or clause text
  console.info(
    JSON.stringify({
      event: 'CONTRACT_ANALYZED',
      auditId: updated.auditId,
      provider: outcome.provider,
      modelId: outcome.modelId,
      attempts: outcome.attempts,
      overallRiskScore: outcome.analysis.overallRiskScore,
      riskCounts,
      durationMs: updated.analysisMeta?.durationMs,
    }),
  );

  return updated;
}

export function createApp(options?: { dailyAuditCap?: number }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'clauseguard-backend',
      phase: 4,
      bedrockModelId: config.bedrockModelId,
      awsRegion: config.awsRegion,
      dailyAuditCap: options?.dailyAuditCap ?? config.dailyAuditCap,
      monobankJarUrl: config.monobankJarUrl,
    });
  });

  app.get('/api/prompt', (_req: Request, res: Response) => {
    res.json({
      bedrockModelId: config.bedrockModelId,
      systemPrompt: SYSTEM_PROMPT,
    });
  });

  // --- Authentication (Sign-Up / Sign-In) ---
  app.post('/api/auth/signup', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name = '', email = '', password = '' } = req.body ?? {};
      const result = await signUpUser(String(name), String(email), String(password));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email = '', password = '' } = req.body ?? {};
      const result = await loginUser(String(email), String(password));
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/auth/config', (_req: Request, res: Response) => {
    res.json({
      googleEnabled: Boolean(config.googleClientId),
      googleClientId: config.googleClientId || null,
    });
  });

  app.post('/api/auth/google', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const credential = String(req.body?.credential ?? '');
      const result = await authenticateWithGoogleIdToken(credential);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Missing Bearer token.' });
      return;
    }
    const payload = verifyJwt(authHeader.slice(7));
    if (!payload) {
      res.status(401).json({ error: 'INVALID_TOKEN', message: 'Session expired or invalid.' });
      return;
    }
    res.json({ user: { id: payload.sub, name: payload.name, email: payload.email } });
  });

  // --- Sample Contracts ---
  app.get('/api/samples', (_req: Request, res: Response) => {
    res.json({ samples: SAMPLE_CATALOG });
  });

  app.get('/api/samples/:filename', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const safeName = path.basename(String(req.params.filename));
      const existsInCatalog = SAMPLE_CATALOG.some((s) => s.filename === safeName);
      if (!existsInCatalog) {
        res.status(404).json({ error: 'SAMPLE_NOT_FOUND', message: 'Sample contract not found.' });
        return;
      }
      const filePath = path.join(config.samplesDir, safeName);
      res.download(filePath, safeName);
    } catch (err) {
      next(err);
    }
  });

  // --- AI Contract Builder & Vetted Clause Library ---
  app.get('/api/builder/templates', (_req: Request, res: Response) => {
    res.json({
      templates: CONTRACT_TEMPLATES,
      clauses: VETTED_CLAUSES,
      moduleTitles: MODULE_TITLES,
      scenarios: BUILDER_SCENARIOS,
    });
  });

  const handleAssembleRequest = async (req: Request) => {
    const body = req.body ?? {};
    if (body.sections && body.parameters && body.fullContractText) {
      return body;
    }
    return assembleContractFromPlainText({
      plainTextRequirements: String(body.plainTextRequirements ?? ''),
      templateId: typeof body.templateId === 'string' ? body.templateId : undefined,
      contractLanguage: body.contractLanguage as BuilderLanguage | undefined,
      posture: body.posture as ClausePosture | undefined,
      selectedClauseIds: body.selectedClauseIds as Partial<Record<ClauseModuleType, string>> | undefined,
      parameterOverrides: body.parameterOverrides as Partial<ContractParameters> | undefined,
    });
  };

  app.post('/api/builder/assemble', async (req: Request, res: Response) => {
    try {
      const assembled = await assembleContractFromPlainText({
        plainTextRequirements: String(req.body?.plainTextRequirements ?? ''),
        templateId: typeof req.body?.templateId === 'string' ? req.body.templateId : undefined,
        contractLanguage: req.body?.contractLanguage as BuilderLanguage | undefined,
        posture: req.body?.posture as ClausePosture | undefined,
        selectedClauseIds: req.body?.selectedClauseIds as
          | Partial<Record<ClauseModuleType, string>>
          | undefined,
        parameterOverrides: req.body?.parameterOverrides as Partial<ContractParameters> | undefined,
      });
      res.json(assembled);
    } catch (err) {
      res.status(400).json({
        error: 'INVALID_BUILDER_INPUT',
        message: err instanceof Error ? err.message : 'Unable to assemble contract.',
      });
    }
  });

  app.post('/api/builder/export/docx', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assembled = await handleAssembleRequest(req);
      const docxBuffer = await generateAssembledContractDocx(assembled);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="ClauseGuard_${assembled.templateId || 'Contract'}.docx"`,
      );
      res.send(docxBuffer);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/builder/export/pdf', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assembled = await handleAssembleRequest(req);
      const pdfBuffer = await generateAssembledContractPdf(assembled);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="ClauseGuard_${assembled.templateId || 'Contract'}.pdf"`,
      );
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  });

  // --- Phase 1 Document Upload & Text Extraction ---
  app.post(
    '/api/extract',
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getOptionalUserId(req);
        const { fileName, buffer, sampleMeta } = await resolveUploadBuffer(req);
        const dealContext = parseDealContextFromRequest(req, sampleMeta?.defaultDealContext);
        const record = await processContractUpload(fileName, buffer, userId, dealContext);
        res.status(201).json(record);
      } catch (err) {
        next(err);
      }
    },
  );

  // --- Phase 2 Risk Analysis on an Existing Extracted Audit ---
  app.post('/api/audits/:auditId/analyze', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await getAuditById(String(req.params.auditId));
      if (!record) {
        res.status(404).json({
          error: 'AUDIT_NOT_FOUND',
          message: 'Audit link not found or expired (contracts auto-delete after 24 hours).',
        });
        return;
      }
      const dealContextOverride = parseDealContextFromRequest(req);
      const analyzed = await runAnalysisOnAudit(
        record,
        options?.dailyAuditCap,
        dealContextOverride,
      );
      res.json(analyzed);
    } catch (err) {
      next(err);
    }
  });

  // --- Combined One-Step Upload + Extract + Analyze ---
  app.post(
    '/api/audits',
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getOptionalUserId(req);
        const { fileName, buffer, sampleMeta } = await resolveUploadBuffer(req);
        const dealContext = parseDealContextFromRequest(req, sampleMeta?.defaultDealContext);
        const extracted = await processContractUpload(fileName, buffer, userId, dealContext);
        const analyzed = await runAnalysisOnAudit(extracted, options?.dailyAuditCap, dealContext);
        res.status(201).json(analyzed);
      } catch (err) {
        next(err);
      }
    },
  );

  app.get('/api/audits/:auditId', async (req: Request, res: Response) => {
    const record = await getAuditById(String(req.params.auditId));
    if (!record) {
      res.status(404).json({
        error: 'AUDIT_NOT_FOUND',
        message: 'Audit link not found or expired (contracts auto-delete after 24 hours).',
      });
      return;
    }
    res.json(record);
  });

  // --- Phase 4: 1-Page Executive Summary PDF Download ---
  app.get('/api/audits/:auditId/pdf', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await getAuditById(String(req.params.auditId));
      if (!record) {
        res.status(404).json({
          error: 'AUDIT_NOT_FOUND',
          message: 'Audit link not found or expired (contracts auto-delete after 24 hours).',
        });
        return;
      }
      if (!record.analysis) {
        res.status(400).json({
          error: 'ANALYSIS_REQUIRED',
          message: 'Run risk analysis before downloading the Executive Summary PDF.',
        });
        return;
      }

      const lang = req.query.lang === 'uk' ? 'uk' : 'en';
      const pdfBuffer = await generateExecutiveSummaryPdf(record, lang);
      const safeBaseName = record.fileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="ClauseGuard_${safeBaseName || 'Summary'}.pdf"`,
      );
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  });

  // --- Phase 4: Voluntary Donation / Payment Abstraction ---
  app.get('/api/donations/config', (_req: Request, res: Response) => {
    res.json({
      monobankJarUrl: config.monobankJarUrl,
      supportedGateways: ['mock', 'monobank_jar', 'wayforpay', 'liqpay'],
      suggestedAmountsUah: [50, 100, 200],
    });
  });

  app.post('/api/donations', async (req: Request, res: Response) => {
    try {
      const amountUah = Number(req.body?.amountUah ?? 100);
      const gateway = (req.body?.gateway ?? 'mock') as DonationGateway;
      const auditId = typeof req.body?.auditId === 'string' ? req.body.auditId : undefined;
      if (!['mock', 'monobank_jar', 'wayforpay', 'liqpay'].includes(gateway)) {
        res.status(400).json({ error: 'INVALID_GATEWAY', message: 'Unsupported donation gateway.' });
        return;
      }
      const checkout = await donationProvider.createDonation({ amountUah, gateway, auditId });
      res.status(201).json(checkout);
    } catch (err) {
      res.status(400).json({
        error: 'DONATION_ERROR',
        message: err instanceof Error ? err.message : 'Invalid donation request.',
      });
    }
  });

  app.get('/api/my-audits', async (req: Request, res: Response) => {
    const userId = getOptionalUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Sign in to view saved audits.' });
      return;
    }
    const audits = await listAuditsByUserId(userId);
    res.json({
      audits: audits.map((a) => ({
        auditId: a.auditId,
        fileName: a.fileName,
        language: a.language,
        pageCount: a.pageCount,
        createdAt: a.createdAt,
        expiresAt: a.expiresAt,
        overallRiskScore: a.analysis?.overallRiskScore ?? null,
        riskCounts: a.analysisMeta?.riskCounts ?? null,
      })),
    });
  });

  // --- Centralized Error Handler ---
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ExtractionError) {
      res.status(err.statusCode).json({
        error: err.code,
        message: err.message,
        details: err.details,
      });
      return;
    }
    if (err instanceof QuotaError) {
      res.status(err.statusCode).json({
        error: err.code,
        message: err.message,
      });
      return;
    }
    if (err instanceof AnalysisError) {
      res.status(err.statusCode).json({
        error: err.code,
        message: err.message,
      });
      return;
    }
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({
        error: 'AUTH_ERROR',
        message: err.message,
      });
      return;
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: 'FILE_TOO_LARGE',
        message: 'File size exceeds the 10 MB maximum limit.',
      });
      return;
    }

    console.error('Unhandled backend error:', err instanceof Error ? err.message : 'Unknown error');
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while processing the request.',
    });
  });

  return app;
}
