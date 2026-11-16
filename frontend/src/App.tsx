import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { fetchAuditById, fetchMyAudits } from './api/client';
import { AuthModal } from './components/AuthModal';
import { DonationModal } from './components/DonationModal';
import { LiveClauseSpecimen } from './components/LiveClauseSpecimen';
import { Navbar } from './components/Navbar';
import { ResultsView } from './components/ResultsView';
import { UploadZone } from './components/UploadZone';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuditExtractionRecord, AuditSummaryItem } from './types';

function readAuditIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const queryId = params.get('audit');
  if (queryId) return queryId;

  const pathMatch = window.location.pathname.match(/^\/audits\/([^/]+)$/);
  return pathMatch ? decodeURIComponent(pathMatch[1]) : null;
}

const MainShell: React.FC = () => {
  const { t } = useLanguage();
  const { user, token } = useAuth();
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'signup' }>({
    open: false,
    mode: 'login',
  });
  const [donateOpen, setDonateOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<AuditExtractionRecord | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditLoadError, setAuditLoadError] = useState(false);
  const [recentAudits, setRecentAudits] = useState<AuditSummaryItem[]>([]);

  const loadAuditFromId = async (auditId: string) => {
    setLoadingAudit(true);
    setAuditLoadError(false);
    try {
      const record = await fetchAuditById(auditId);
      setActiveRecord(record);
    } catch {
      setActiveRecord(null);
      setAuditLoadError(true);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Load audit directly when user opens a shared ?audit=<uuid> or /audits/<uuid> link
  useEffect(() => {
    const urlAuditId = readAuditIdFromUrl();
    if (urlAuditId) {
      void loadAuditFromId(urlAuditId);
    }

    const onPopState = () => {
      const nextId = readAuditIdFromUrl();
      if (nextId) {
        void loadAuditFromId(nextId);
      } else {
        setActiveRecord(null);
        setAuditLoadError(false);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Load signed-in user's recent 24h audits
  useEffect(() => {
    if (!token || !user) {
      setRecentAudits([]);
      return;
    }
    fetchMyAudits(token)
      .then(setRecentAudits)
      .catch(() => setRecentAudits([]));
  }, [token, user, activeRecord]);

  const openRecord = (record: AuditExtractionRecord) => {
    setActiveRecord(record);
    setAuditLoadError(false);
    const targetUrl = `/?audit=${encodeURIComponent(record.auditId)}`;
    if (window.location.search !== `?audit=${encodeURIComponent(record.auditId)}`) {
      window.history.pushState({}, '', targetUrl);
    }
  };

  const resetToUpload = () => {
    setActiveRecord(null);
    setAuditLoadError(false);
    if (window.location.search || window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-bg text-ink-primary">
      <Navbar
        onOpenAuth={(mode) => setAuthModal({ open: true, mode })}
        onOpenDonate={() => setDonateOpen(true)}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {loadingAudit ? (
          <div className="flex items-center justify-center border border-surface-strong bg-surface-card p-12 text-sm font-medium text-brand">
            <Loader2 className="mr-2.5 h-5 w-5 animate-spin" aria-hidden="true" />
            <span>{t.auditNotFound.loading}</span>
          </div>
        ) : auditLoadError ? (
          <div className="border border-surface-strong bg-surface-card p-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-risk-highText" aria-hidden="true" />
              <div>
                <h1 className="font-serif text-xl font-semibold text-ink-primary">
                  {t.auditNotFound.title}
                </h1>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-secondary">
                  {t.auditNotFound.description}
                </p>
                <button
                  type="button"
                  onClick={resetToUpload}
                  className="mt-4 inline-flex items-center gap-2 border border-surface-strong bg-brand px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-hover"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.auditNotFound.backBtn}</span>
                </button>
              </div>
            </div>
          </div>
        ) : !activeRecord ? (
          <div className="space-y-8">
            {/* Title + 1-2-3 Step Bar */}
            <div className="space-y-6 border-b border-surface-border pb-6">
              <div className="max-w-3xl space-y-2.5">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-brand">
                  {t.workspace.eyebrow}
                </p>
                <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-ink-primary sm:text-4xl">
                  {t.workspace.title}
                </h1>
                <p className="text-sm leading-relaxed text-ink-secondary sm:text-base">
                  {t.workspace.subtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 divide-y divide-surface-border border border-surface-strong bg-surface-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {t.workspace.steps.map((step) => (
                  <div key={step.num} className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-brand px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">
                        {step.num}
                      </span>
                      <span className="text-sm font-semibold text-ink-primary">{step.title}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Signed-in User's Recent Audits (24h TTL) */}
            {user && recentAudits.length > 0 && (
              <section className="border border-surface-strong bg-surface-card">
                <div className="border-b border-surface-strong bg-surface-subtle px-4 py-2.5">
                  <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-primary">
                    {t.recentAudits.title}
                  </h2>
                </div>
                <div className="divide-y divide-surface-border">
                  {recentAudits.slice(0, 5).map((item) => (
                    <div
                      key={item.auditId}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium text-ink-primary">
                          {item.fileName}
                        </span>
                        {item.overallRiskScore !== null && (
                          <span className="border border-surface-border bg-surface-bg px-2 py-0.5 font-mono text-xs font-semibold text-ink-secondary">
                            {t.recentAudits.scorePrefix}: {item.overallRiskScore}/100
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void loadAuditFromId(item.auditId)}
                        className="border border-surface-strong bg-surface-bg px-3 py-1 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-subtle"
                      >
                        {t.recentAudits.openBtn}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Primary Action: Upload Box + Sample Contracts */}
            <UploadZone onExtracted={openRecord} />

            {/* Full-Width 3-Column Real Audit Specimen */}
            <LiveClauseSpecimen />
          </div>
        ) : (
          <ResultsView
            record={activeRecord}
            onReset={resetToUpload}
            onOpenDonate={() => setDonateOpen(true)}
          />
        )}
      </main>

      <footer className="border-t border-surface-strong bg-surface-subtle">
        <div className="mx-auto max-w-6xl px-4 py-3 text-xs text-ink-secondary sm:px-6">
          {t.disclaimerBanner}
        </div>
      </footer>

      <AuthModal
        isOpen={authModal.open}
        initialMode={authModal.mode}
        onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
      />

      <DonationModal isOpen={donateOpen} onClose={() => setDonateOpen(false)} />
    </div>
  );
};

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainShell />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
