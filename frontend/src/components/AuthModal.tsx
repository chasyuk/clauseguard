import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ApiClientError, fetchAuthConfig } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'signup';
  onClose: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (opts: {
            client_id: string;
            callback: (resp: { credential?: string }) => void;
          }) => void;
          renderButton: (
            el: HTMLElement,
            opts: Record<string, string | number | boolean>,
          ) => void;
        };
      };
    };
  }
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, initialMode, onClose }) => {
  const { t } = useLanguage();
  const { login, register, loginWithGoogle } = useAuth();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string>(
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '',
  );
  const [googleButtonRendered, setGoogleButtonRendered] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (googleClientId) return;
    fetchAuthConfig()
      .then((cfg) => {
        if (cfg.googleClientId) setGoogleClientId(cfg.googleClientId);
      })
      .catch(() => {
        // Ignore non-blocking auth config lookup
      });
  }, [googleClientId]);

  useEffect(() => {
    if (!isOpen || !googleClientId || !googleBtnRef.current) {
      setGoogleButtonRendered(false);
      return;
    }

    const gsi = window.google?.accounts?.id;
    if (!gsi) {
      setGoogleButtonRendered(false);
      return;
    }

    gsi.initialize({
      client_id: googleClientId,
      callback: (resp) => {
        if (!resp.credential) return;
        setError(null);
        setSubmitting(true);
        void loginWithGoogle(resp.credential)
          .then(() => onClose())
          .catch((err) => {
            setError(
              err instanceof ApiClientError ? err.message : 'Google sign-in failed.',
            );
          })
          .finally(() => setSubmitting(false));
      },
    });

    googleBtnRef.current.innerHTML = '';
    gsi.renderButton(googleBtnRef.current, {
      theme: 'outline',
      size: 'large',
      width: 360,
      text: mode === 'signup' ? 'signup_with' : 'signin_with',
    });
    setGoogleButtonRendered(true);
  }, [isOpen, googleClientId, mode, loginWithGoogle, onClose]);

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

        {/* Google Sign-Up / Sign-In */}
        <div className="mt-4">
          <div
            ref={googleBtnRef}
            className={googleButtonRendered ? 'flex justify-center' : 'hidden'}
          />
          {!googleButtonRendered && (
            <button
              type="button"
              onClick={() => setError(t.auth.googleNotConfigured)}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-zinc-200"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              <span>{t.auth.googleBtn}</span>
            </button>
          )}
        </div>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-surface-border" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            {t.auth.orDivider}
          </span>
          <div className="h-px flex-1 bg-surface-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
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
            className="w-full rounded-md border border-surface-strong bg-surface-subtle px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-surface-border disabled:opacity-60"
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
