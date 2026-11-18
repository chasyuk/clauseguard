import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ApiClientError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'signup';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, initialMode, onClose }) => {
  const { t } = useLanguage();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Authentication failed. Verify your email and password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-lg border border-surface-strong bg-surface-card p-6">
        <div className="flex items-start justify-between border-b border-surface-border pb-3">
          <div>
            <h2 id="auth-modal-title" className="font-display text-lg font-bold text-white">
              {mode === 'signup' ? t.auth.signUpTitle : t.auth.signInTitle}
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">{t.auth.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.auth.close}
            className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-medium text-ink-secondary">
                {t.auth.nameLabel}
              </label>
              <input
                id="auth-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-surface-border bg-surface-bg px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-ink-secondary">
              {t.auth.emailLabel}
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-surface-border bg-surface-bg px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-medium text-ink-secondary">
              {t.auth.passwordLabel}
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-surface-border bg-surface-bg px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-risk-highBorder bg-risk-highBg px-3 py-2 text-xs text-risk-highText"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-zinc-200 disabled:opacity-60"
          >
            {submitting
              ? '...'
              : mode === 'signup'
                ? t.auth.signUpBtn
                : t.auth.signInBtn}
          </button>
        </form>

        <div className="mt-4 border-t border-surface-border pt-3 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signup' ? 'login' : 'signup');
              setError(null);
            }}
            className="text-xs font-medium text-brand-text hover:underline"
          >
            {mode === 'signup' ? t.auth.switchToSignIn : t.auth.switchToSignUp}
          </button>
        </div>
      </div>
    </div>
  );
};
