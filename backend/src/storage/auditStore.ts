import fs from 'node:fs/promises';
import path from 'node:path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { ContractAnalysisResult, DealContext } from '../ai/schema.js';
import { config } from '../config.js';
import { ClauseItem, ContractLanguage } from '../extraction/clauseSplitter.js';
import { SupportedExtension } from '../extraction/fileValidator.js';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  plan?: 'free' | 'pro' | 'single';
}

export interface AnalysisMeta {
  provider: 'bedrock' | 'local_fallback';
  modelId: string;
  attempts: number;
  analyzedAt: string;
  durationMs: number;
  riskCounts: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface AuditRecord {
  auditId: string;
  userId: string | null;
  fileName: string;
  extension: SupportedExtension;
  fileSizeBytes: number;
  pageCount: number;
  wordCount: number;
  language: ContractLanguage;
  clauses: ClauseItem[];
  createdAt: string;
  expiresAt: string;
  ttlEpochSeconds: number;
  dealContext?: DealContext;
  analysis?: ContractAnalysisResult;
  analysisMeta?: AnalysisMeta;
}

export class QuotaError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 429) {
    super(message);
    this.name = 'QuotaError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const USERS_FILE = path.join(config.localDataDir, 'users.json');
const AUDITS_FILE = path.join(config.localDataDir, 'audits.json');
const DAILY_USAGE_FILE = path.join(config.localDataDir, 'daily-usage.json');

let docClient: DynamoDBDocumentClient | null = null;

function getDynamoTable(): string | undefined {
  return process.env.DYNAMO_TABLE || undefined;
}

function getDynamoDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const raw = new DynamoDBClient({ region: config.awsRegion });
    docClient = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return docClient;
}

async function ensureLocalDir(): Promise<void> {
  await fs.mkdir(config.localDataDir, { recursive: true });
}

async function readJsonMap<T>(filePath: string): Promise<Record<string, T>> {
  await ensureLocalDir();
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, T>;
  } catch {
    return {};
  }
}

async function writeJsonMap<T>(filePath: string, data: Record<string, T>): Promise<void> {
  await ensureLocalDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const normalized = email.toLowerCase();
  const tableName = getDynamoTable();
  if (tableName) {
    const res = await getDynamoDocClient().send(
      new GetCommand({
        TableName: tableName,
        Key: { PK: `USER#${normalized}`, SK: 'PROFILE' },
      }),
    );
    return (res.Item?.data as StoredUser | undefined) ?? null;
  }

  const users = await readJsonMap<StoredUser>(USERS_FILE);
  return users[normalized] ?? null;
}

export async function saveUser(user: StoredUser): Promise<void> {
  const normalized = user.email.toLowerCase();
  const tableName = getDynamoTable();
  if (tableName) {
    await getDynamoDocClient().send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: `USER#${normalized}`,
          SK: 'PROFILE',
          data: user,
        },
      }),
    );
    return;
  }

  const users = await readJsonMap<StoredUser>(USERS_FILE);
  users[normalized] = user;
  await writeJsonMap(USERS_FILE, users);
}

export async function saveAudit(audit: AuditRecord): Promise<void> {
  const tableName = getDynamoTable();
  if (tableName) {
    await getDynamoDocClient().send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: `AUDIT#${audit.auditId}`,
          SK: 'DATA',
          ttl: audit.ttlEpochSeconds,
          data: audit,
        },
      }),
    );

    if (audit.userId) {
      await getDynamoDocClient().send(
        new PutCommand({
          TableName: tableName,
          Item: {
            PK: `USER_AUDITS#${audit.userId}`,
            SK: `${audit.createdAt}#${audit.auditId}`,
            ttl: audit.ttlEpochSeconds,
            data: audit,
          },
        }),
      );
    }
    return;
  }

  const audits = await readJsonMap<AuditRecord>(AUDITS_FILE);
  const nowSec = Math.floor(Date.now() / 1000);

  // Purge expired records (>24h) whenever saving to keep local storage clean
  for (const [id, record] of Object.entries(audits)) {
    if (record.ttlEpochSeconds < nowSec) {
      delete audits[id];
    }
  }

  audits[audit.auditId] = audit;
  await writeJsonMap(AUDITS_FILE, audits);
}

export async function getAuditById(auditId: string): Promise<AuditRecord | null> {
  const nowSec = Math.floor(Date.now() / 1000);
  const tableName = getDynamoTable();
  if (tableName) {
    const res = await getDynamoDocClient().send(
      new GetCommand({
        TableName: tableName,
        Key: { PK: `AUDIT#${auditId}`, SK: 'DATA' },
      }),
    );
    const record = (res.Item?.data as AuditRecord | undefined) ?? null;
    if (!record || record.ttlEpochSeconds < nowSec) return null;
    return record;
  }

  const audits = await readJsonMap<AuditRecord>(AUDITS_FILE);
  const record = audits[auditId];
  if (!record || record.ttlEpochSeconds < nowSec) {
    return null;
  }
  return record;
}

export async function listAuditsByUserId(userId: string): Promise<AuditRecord[]> {
  const nowSec = Math.floor(Date.now() / 1000);
  const tableName = getDynamoTable();
  if (tableName) {
    const res = await getDynamoDocClient().send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': `USER_AUDITS#${userId}` },
        ScanIndexForward: false,
        Limit: 10,
      }),
    );
    return (res.Items ?? [])
      .map((item) => item.data as AuditRecord)
      .filter((record) => record && record.ttlEpochSeconds >= nowSec);
  }

  const audits = await readJsonMap<AuditRecord>(AUDITS_FILE);
  return Object.values(audits)
    .filter((record) => record.userId === userId && record.ttlEpochSeconds >= nowSec)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function checkAndIncrementDailyCap(
  maxPerDay: number,
  dateKey = getTodayDateKey(),
): Promise<{ used: number; limit: number }> {
  const tableName = getDynamoTable();
  if (tableName) {
    try {
      const ttl = Math.floor(Date.now() / 1000) + 48 * 60 * 60;
      const res = await getDynamoDocClient().send(
        new UpdateCommand({
          TableName: tableName,
          Key: { PK: `USAGE#${dateKey}`, SK: 'COUNT' },
          UpdateExpression: 'SET #cnt = if_not_exists(#cnt, :zero) + :inc, #ttl = :ttl',
          ConditionExpression: 'attribute_not_exists(#cnt) OR #cnt < :cap',
          ExpressionAttributeNames: { '#cnt': 'count', '#ttl': 'ttl' },
          ExpressionAttributeValues: { ':zero': 0, ':inc': 1, ':cap': maxPerDay, ':ttl': ttl },
          ReturnValues: 'UPDATED_NEW',
        }),
      );
      return { used: Number(res.Attributes?.count ?? 1), limit: maxPerDay };
    } catch (err) {
      if (err && typeof err === 'object' && 'name' in err && err.name === 'ConditionalCheckFailedException') {
        throw new QuotaError(
          'DAILY_CAP_REACHED',
          `Daily free audit cap (${maxPerDay}/day) reached to protect API credits. Please try again tomorrow.`,
          429,
        );
      }
      throw err;
    }
  }

  const usage = await readJsonMap<number>(DAILY_USAGE_FILE);
  const current = usage[dateKey] ?? 0;

  if (current >= maxPerDay) {
    throw new QuotaError(
      'DAILY_CAP_REACHED',
      `Daily free audit cap (${maxPerDay}/day) reached to protect API credits. Please try again tomorrow.`,
      429,
    );
  }

  const next = current + 1;
  usage[dateKey] = next;
  await writeJsonMap(DAILY_USAGE_FILE, usage);
  return { used: next, limit: maxPerDay };
}

export async function resetDailyCapForDate(dateKey = getTodayDateKey()): Promise<void> {
  const usage = await readJsonMap<number>(DAILY_USAGE_FILE);
  delete usage[dateKey];
  await writeJsonMap(DAILY_USAGE_FILE, usage);
}
