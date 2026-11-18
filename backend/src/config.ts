import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Disable slow EC2 metadata lookups when running outside AWS Lambda/EC2 while preserving ~/.aws credentials
if (!process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.AWS_EXECUTION_ENV) {
  process.env.AWS_EC2_METADATA_DISABLED ??= 'true';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const lambdaSamplesDir = path.resolve(__dirname, '../samples');
const repoSamplesDir = path.resolve(__dirname, '../../samples');

export const config = {
  port: Number(process.env.PORT ?? 3001),
  awsRegion: process.env.AWS_REGION ?? 'us-east-1',
  bedrockModelId: process.env.BEDROCK_MODEL_ID ?? 'amazon.nova-lite-v1:0',
  bedrockMode: process.env.BEDROCK_MODE ?? 'auto', // 'auto' | 'bedrock' | 'local'
  dailyAuditCap: Number(process.env.DAILY_AUDIT_CAP ?? 50),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-local-secret-change-in-prod',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  monobankJarUrl: process.env.MONOBANK_JAR_URL ?? 'https://send.monobank.ua/jar/your-jar-id',
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB
  maxPages: 30,
  auditTtlHours: 24,
  samplesDir: fs.existsSync(lambdaSamplesDir) ? lambdaSamplesDir : repoSamplesDir,
  localDataDir: process.env.AWS_LAMBDA_FUNCTION_NAME
    ? '/tmp/.local-data'
    : path.resolve(__dirname, '../.local-data'),
};
