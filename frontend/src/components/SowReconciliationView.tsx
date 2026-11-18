import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  FileDown,
  FileText,
  Loader2,
  MessageSquare,
  RotateCcw,
  Scale,
  Sparkles,
  Upload,
} from 'lucide-react';
import * as api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AuditExtractionRecord, DiscrepancyDimension } from '../types';

export interface DiscrepancyItem {
  id: string;
  category:
    | 'SCOPE_CREEP'
    | 'DEADLINE_MISMATCH'
    | 'PAYMENT_TERMS'
    | 'REVISIONS_LIMIT'
    | 'UNAGREED_PENALTY';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  chatAgreed: string;
  contractWritten: string;
  discrepancyExplanation: string;
  clientMessageSuggestion: string;
}

interface SowReconciliationViewProps {
  onOpenAuditRecord?: (record: AuditExtractionRecord) => void;
}

const DEMO_CHAT_TEXT = `Клієнт (Олег, СЕО стартапу):
«Привіт! Нам треба зробити UI/UX редизайн 3 основних сторінок інтернет-магазину (Головна, Каталог, Картка товару).
Бюджет фіксований — $1,200.
Дедлайн — до 25 грудня.
Оплата: 50% аванс перед стартом, 50% після фінального узгодження макетів.
Включено 2 раунди правок. Зможеш взяти?»

Я (ФОП Розробник/Дизайнер):
«Привіт, Олеже! Так, умови підходять: 3 сторінки, $1200, 50% аванс, дедлайн 25 грудня, 2 раунди правок. Надсилай договір на підпис!»`;

const DEMO_CONTRACT_TEXT = `ДОГОВІР ПРО НАДАННЯ ПОСЛУГ З ДИЗАЙНУ № 19/2026
1.1. ПРЕДМЕТ: Виконавець зобов'язується розробити повний UI/UX дизайн веб-сайту Замовника, включаючи 12 сторінок, мобільну версію для iOS/Android та єдину дизайн-систему в Figma.
2.1. СТРОКИ: Виконавець зобов'язується повністю надати результати послуг у строк до 10 грудня 2026 року.
3.1. ВАРТІСТЬ ТА ПОРЯДОК РОЗРАХУНКІВ: Загальна вартість послуг становить 1 000 доларів США. Оплата здійснюється без виплати авансу, протягом 45 банківських днів після повного підписання Акта приймання-передачі.
4.1. ПРАВКИ ТА ЗДАЧА: Виконавець зобов'язується вносити необмежену кількість правок та доопрацювань до повного затвердження макетів Замовником без додаткової оплати.
5.1. ШТРАФНІ САНКЦІЇ: За кожен день затримки здачі макетів Виконавець сплачує неустойку у розмірі 100 доларів США за кожен день прострочення.`;

function mapDimensionToCategory(dim: DiscrepancyDimension): DiscrepancyItem['category'] {
  switch (dim) {
    case 'SCOPE_AND_DELIVERABLES':
      return 'SCOPE_CREEP';
    case 'TIMELINE_AND_DEADLINES':
      return 'DEADLINE_MISMATCH';
    case 'PAYMENT_AND_MILESTONES':
      return 'PAYMENT_TERMS';
    case 'REVISIONS_AND_ACCEPTANCE':
      return 'REVISIONS_LIMIT';
    case 'EXCLUSIONS_AND_IP':
      return 'UNAGREED_PENALTY';
  }
}

export const SowReconciliationView: React.FC<SowReconciliationViewProps> = ({
  onOpenAuditRecord,
}) => {
  const { lang } = useLanguage();
  const { token } = useAuth();
  const isUk = lang === 'uk';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [chatText, setChatText] = useState('');
  const [contractText, setContractText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [extractingFile, setExtractingFile] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<DiscrepancyItem[] | null>(null);
  const [awsRecord, setAwsRecord] = useState<AuditExtractionRecord | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleLoadDemo = () => {
    setErrorMsg(null);
    setUploadedFileName(null);
    setChatText(DEMO_CHAT_TEXT);
    setContractText(DEMO_CONTRACT_TEXT);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg(null);
    setExtractingFile(true);
    try {
      const extracted = await api.extractContractFile(file, token);
      const joined = extracted.clauses
        .map(
          (c) =>
            `${c.clauseNumber ? c.clauseNumber + ' ' : ''}${c.title ? c.title + ': ' : ''}${c.text}`,
        )
        .join('\n\n');
      setContractText(joined);
      setUploadedFileName(file.name);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          (isUk ? 'Не вдалося прочитати текст із файлу.' : 'Failed to extract file text.'),
      );
    } finally {
      setExtractingFile(false);
    }
  };

  const handleRunReconciliation = async () => {
    if (!chatText.trim() || !contractText.trim()) return;

    setErrorMsg(null);
    setAnalyzing(true);
    try {
      const record = await api.reconcileTextAudit(
        chatText,
        contractText,
        token,
        uploadedFileName || 'SOW_Reconciliation.docx',
      );
      setAwsRecord(record);

      const discrepancies = (record.analysis?.contextDiscrepancies ?? []).filter(
        (d) => d.status !== 'MATCH',
      );

      const mappedDiscrepancies: DiscrepancyItem[] = discrepancies.map((d, idx) => ({
        id: `aws-disc-${idx}`,
        category: mapDimensionToCategory(d.dimension),
        severity: d.status === 'MISMATCH' ? 'HIGH' : 'MEDIUM',
        title: d.riskImpact.split('.')[0] || d.dimension,
        chatAgreed: d.agreedTerm,
        contractWritten: d.contractTerm,
        discrepancyExplanation: d.riskImpact,
        clientMessageSuggestion: d.suggestedAmendment,
      }));

      const coveredExcerpts = new Set(
        mappedDiscrepancies.map((m) => m.contractWritten.slice(0, 35).toLowerCase()),
      );
      const extraFlags: DiscrepancyItem[] = (record.analysis?.flaggedClauses ?? [])
        .filter((fc) => !coveredExcerpts.has(fc.originalExcerpt.slice(0, 35).toLowerCase()))
        .map((fc, idx) => ({
          id: `aws-flag-${idx}`,
          category:
            fc.category === 'DELAYED_PAYMENT'
              ? 'PAYMENT_TERMS'
              : fc.category === 'PENALTY_CLAUSES'
                ? 'UNAGREED_PENALTY'
                : 'SCOPE_CREEP',
          severity: fc.riskLevel,
          title: `§ ${fc.clauseNumber}: ${fc.plainLanguageSummary.split('.')[0]}`,
          chatAgreed: isUk
            ? 'Не погоджувалося в переписці (одностороння умова клієнта)'
            : 'Not agreed in chat (unilateral client clause)',
          contractWritten: fc.originalExcerpt,
          discrepancyExplanation: fc.plainLanguageSummary,
          clientMessageSuggestion: fc.counterClause,
        }));

      setResults([...mappedDiscrepancies, ...extraFlags]);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          (isUk
            ? 'Помилка звернення до AWS Bedrock API. Спробуйте ще раз.'
            : 'AWS Bedrock API request failed. Please try again.'),
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadAwsPdf = async () => {
    if (!awsRecord) return;
    setDownloadingPdf(true);
    try {
      await api.downloadExecutivePdf(awsRecord.auditId, awsRecord.fileName, lang);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    if (!results) return;
    const combined = results
      .map((r, i) => `${i + 1}. ${r.title}:\n${r.clientMessageSuggestion}`)
      .join('\n\n');
    void navigator.clipboard.writeText(combined);
    setCopiedId('all');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const categoryLabels: Record<DiscrepancyItem['category'], string> = {
    SCOPE_CREEP: isUk ? 'Роздування скоупу (Scope Creep)' : 'Scope Creep',
    DEADLINE_MISMATCH: isUk ? 'Зсув дедлайну' : 'Deadline Mismatch',
    PAYMENT_TERMS: isUk ? 'Підміна умов оплати' : 'Payment Terms Mismatch',
    REVISIONS_LIMIT: isUk ? 'Пастка з правками' : 'Revisions Trap',
    UNAGREED_PENALTY: isUk ? 'Неузгоджений штраф / ризик' : 'Unagreed Penalty / Risk',
  };

  return (
    <div className="space-y-6">
      {/* Header + 1-Click Demo Button */}
      <div className="flex flex-col justify-between gap-4 border-b border-paper-border pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-primary sm:text-2xl">
            {isUk
              ? 'Звірка договору з перепискою в месенджері'
              : 'Reconcile SOW against messenger chat'}
          </h2>
          <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
            {isUk
              ? 'Вставте повідомлення з Telegram / Slack / Upwork та текст або файл договору — ШІ знайде, де клієнт непомітно змінив обсяг робіт, дедлайн чи оплату.'
              : 'Paste your Telegram / Slack / Upwork messages alongside the contract — AI spots where the client quietly shifted scope, deadline, or payment terms.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadDemo}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-paper-border bg-paper px-3.5 py-2 text-xs font-bold text-ink-primary transition-colors hover:border-signal hover:text-signal"
        >
          <Sparkles className="h-3.5 w-3.5 text-signal" aria-hidden="true" />
          <span>
            {isUk ? 'Підставити демо-приклад (1 клік)' : 'Load 1-Click Demo Example'}
          </span>
        </button>
      </div>

      {/* 2 Columns: Messenger Chat vs SOW Contract */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Column 1: Agreed in Messenger */}
        <div className="rounded-2xl border border-paper-border bg-paper-soft/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-forest text-white">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-bold text-ink-primary">
                {isUk
                  ? '1. Про що домовлялися (Чат / Бриф)'
                  : '1. What was agreed (Chat / Brief)'}
              </h3>
            </div>
            <span className="font-mono text-[11px] text-ink-muted">Telegram / Slack / Upwork</span>
          </div>
          <p className="text-xs text-ink-secondary">
            {isUk
              ? 'Вставте листування, де погоджували бюджет, дедлайн, обсяг або кількість правок:'
              : 'Paste messages where budget, deadline, scope, or revisions were agreed:'}
          </p>
          <textarea
            rows={8}
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            placeholder={
              isUk
                ? 'Клієнт: «Потрібно 3 сторінки, $1200, здача до 25 грудня, 50% аванс, 2 раунди правок...»'
                : 'Client: "We need 3 pages, $1200, deadline Dec 25, 50% upfront, 2 rounds of revisions..."'
            }
            className="w-full resize-none rounded-xl border border-paper-border bg-white p-3.5 font-mono text-xs leading-relaxed text-ink-primary outline-none focus:border-forest"
          />
        </div>

        {/* Column 2: Contract / SOW Sent by Client */}
        <div className="rounded-2xl border border-paper-border bg-paper-soft/40 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-signal text-white">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-bold text-ink-primary">
                {isUk
                  ? '2. Що надіслав клієнт (Договір / SOW)'
                  : '2. What the client sent (Contract / SOW)'}
              </h3>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pdf"
                onChange={(e) => void handleFileUpload(e)}
                className="hidden"
              />
              <button
                type="button"
                disabled={extractingFile}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-paper-border bg-white px-2.5 py-1 text-[11px] font-bold text-ink-primary transition-colors hover:border-signal hover:text-signal disabled:opacity-50"
              >
                <Upload className="h-3 w-3" aria-hidden="true" />
                <span>
                  {extractingFile
                    ? isUk
                      ? 'Читаємо файл...'
                      : 'Extracting...'
                    : uploadedFileName
                      ? uploadedFileName
                      : isUk
                        ? 'Завантажити .docx / .pdf'
                        : 'Upload .docx / .pdf'}
                </span>
              </button>
            </div>
          </div>
          <p className="text-xs text-ink-secondary">
            {isUk
              ? 'Вставте текст договору (SOW) або завантажте файл Word / PDF кнопкою вище:'
              : 'Paste the formal contract / SOW text or upload a Word / PDF file above:'}
          </p>
          <textarea
            rows={8}
            value={contractText}
            onChange={(e) => setContractText(e.target.value)}
            placeholder={
              isUk
                ? 'ДОГОВІР ПРО НАДАННЯ ПОСЛУГ...\n1.1. Предмет: розробка 12 сторінок та мобільної версії...\n3.1. Вартість: 1000$ без авансу...'
                : 'STATEMENT OF WORK...\n1.1. Deliverables: 12 pages and mobile version...\n3.1. Fee: $1000 Net 45...'
            }
            className="w-full resize-none rounded-xl border border-paper-border bg-white p-3.5 font-mono text-xs leading-relaxed text-ink-primary outline-none focus:border-forest"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-risk-highBorder bg-risk-highBg p-3.5 text-center text-xs font-semibold text-risk-highText">
          {errorMsg}
        </div>
      )}

      {/* Primary CTA Button */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          disabled={analyzing || !chatText.trim() || !contractText.trim()}
          onClick={() => void handleRunReconciliation()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-signal px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-signal-hover disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>
                {isUk
                  ? 'ШІ зіставляє переписку та текст договору...'
                  : 'AI is comparing chat against contract...'}
              </span>
            </>
          ) : (
            <>
              <Scale className="h-4 w-4" aria-hidden="true" />
              <span>
                {isUk ? 'Порівняти переписку з договором' : 'Compare Chat with Contract'}
              </span>
            </>
          )}
        </button>

        {results && (
          <button
            type="button"
            onClick={() => {
              setResults(null);
              setAwsRecord(null);
              setUploadedFileName(null);
              setChatText('');
              setContractText('');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isUk ? 'Очистити форму' : 'Clear form'}</span>
          </button>
        )}
      </div>

      {/* Results Section */}
      {results && (
        <div className="space-y-5 pt-2">
          {/* Status & Export Bar */}
          {awsRecord && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-paper-border bg-paper-soft px-4 py-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
                <span className="font-bold text-ink-primary">
                  {isUk ? 'Перевірено ШІ' : 'Verified by AI'}:{' '}
                  <span className="font-mono">{awsRecord.analysisMeta?.modelId}</span>
                </span>
                {typeof awsRecord.analysis?.contextAlignmentScore === 'number' && (
                  <span className="rounded-full bg-signal-soft px-2.5 py-0.5 font-mono text-[11px] font-bold text-signal">
                    {isUk ? 'Відповідність домовленостям' : 'Chat Alignment'}:{' '}
                    {awsRecord.analysis.contextAlignmentScore}/100
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={() => void handleDownloadAwsPdf()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-paper-border bg-white px-3 py-1.5 text-xs font-semibold text-ink-primary hover:border-paper-strong disabled:opacity-50"
                >
                  <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {downloadingPdf
                      ? '...'
                      : isUk
                        ? 'Завантажити 1-стор. PDF'
                        : 'Download 1-Page PDF'}
                  </span>
                </button>

                {onOpenAuditRecord && (
                  <button
                    type="button"
                    onClick={() => onOpenAuditRecord(awsRecord)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-white hover:bg-forest-deep"
                  >
                    <span>
                      {isUk ? 'Відкрити мапу пунктів' : 'Open clause map'}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Summary Banner */}
          <div className="rounded-2xl border border-risk-highBorder bg-risk-highBg p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <h3 className="font-display text-base font-bold text-ink-primary">
                  {isUk
                    ? `Виявлено ${results.length} розбіжностей між месенджером і договором`
                    : `Found ${results.length} discrepancies between messenger chat & contract`}
                </h3>
                {awsRecord?.analysis?.executiveSummary && (
                  <p className="text-xs leading-relaxed text-ink-secondary">
                    {awsRecord.analysis.executiveSummary}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleCopyAll}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-bold text-white hover:bg-forest-deep"
              >
                {copiedId === 'all' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#86EFAC]" aria-hidden="true" />
                    <span>{isUk ? 'Скопійовано всі правки!' : 'Copied all replies!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {isUk
                        ? 'Скопіювати всі зауваження для клієнта'
                        : 'Copy all replies for client'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Discrepancy Comparison Cards */}
          <div className="space-y-4">
            {results.map((disc, idx) => (
              <div
                key={disc.id}
                className="overflow-hidden rounded-2xl border border-paper-border bg-white shadow-xs"
              >
                <div className="h-1 w-full bg-signal" />
                <div className="p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-border pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-forest font-mono text-xs font-bold text-white">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-ink-primary">{disc.title}</h4>
                    </div>
                    <span className="rounded-full bg-signal-soft px-2.5 py-0.5 font-mono text-[11px] font-semibold text-signal">
                      {categoryLabels[disc.category]}
                    </span>
                  </div>

                  {/* Side-by-side Chat vs Contract */}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-paper-border bg-paper-soft/60 p-3.5 space-y-1">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#15803D]">
                        {isUk ? 'Домовлено в месенджері:' : 'Agreed in messenger:'}
                      </div>
                      <p className="text-xs font-medium leading-relaxed text-ink-primary">
                        «{disc.chatAgreed}»
                      </p>
                    </div>

                    <div className="rounded-xl border border-risk-highBorder bg-risk-highBg/60 p-3.5 space-y-1">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-risk-highText">
                        {isUk ? 'Вписано в договір / SOW:' : 'Written in contract / SOW:'}
                      </div>
                      <p className="text-xs font-medium leading-relaxed text-ink-primary">
                        «{disc.contractWritten}»
                      </p>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="flex items-start gap-2 rounded-xl bg-paper p-3 text-xs text-ink-secondary">
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]"
                      aria-hidden="true"
                    />
                    <span>{disc.discrepancyExplanation}</span>
                  </div>

                  {/* Ready reply to copy */}
                  <div className="rounded-xl border border-paper-border bg-white p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                        {isUk
                          ? 'Готова правка / повідомлення для клієнта:'
                          : 'Ready amendment / reply to send client:'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(disc.id, disc.clientMessageSuggestion)}
                        className="inline-flex items-center gap-1 font-mono text-xs font-bold text-signal hover:underline"
                      >
                        {copiedId === disc.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-[#15803D]" aria-hidden="true" />
                            <span className="text-[#15803D]">
                              {isUk ? 'Скопійовано!' : 'Copied!'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{isUk ? 'Скопіювати' : 'Copy'}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-xs leading-relaxed text-ink-primary">
                      {disc.clientMessageSuggestion}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
