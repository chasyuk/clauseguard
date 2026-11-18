import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { findUserByEmail, saveUser, StoredUser } from '../storage/auditStore.js';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  name: string;
  exp: number;
}

export class AuthError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function base64UrlEncode(data: string | Buffer): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf-8');
}

export function signJwt(payload: AuthTokenPayload): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(`${header}.${body}`)
    .digest();
  return `${header}.${body}.${base64UrlEncode(signature)}`;
}

export function verifyJwt(token: string): AuthTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', config.jwtSecret).update(`${header}.${body}`).digest(),
    );
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    const payload = JSON.parse(base64UrlDecode(body)) as AuthTokenPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export async function signUpUser(
  name: string,
  email: string,
  password: string,
): Promise<{ token: string; user: PublicUser }> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  if (!trimmedName || trimmedName.length < 2) {
    throw new AuthError('Name must be at least 2 characters.', 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new AuthError('Please enter a valid email address.', 400);
  }
  if (!password || password.length < 6) {
    throw new AuthError('Password must be at least 6 characters.', 400);
  }

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new AuthError('An account with this email already exists.', 409);
  }

  const user: StoredUser = {
    id: uuidv4(),
    name: trimmedName,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  await saveUser(user);
  const token = signJwt({
    sub: user.id,
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  });

  return { token, user: toPublicUser(user) };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ token: string; user: PublicUser }> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new AuthError('Invalid email or password.', 401);
  }

  const token = signJwt({
    sub: user.id,
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  });

  return { token, user: toPublicUser(user) };
}

export interface GoogleTokenClaims {
  email: string;
  email_verified?: string | boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  aud?: string;
  iss?: string;
  exp?: string | number;
}

export type GoogleTokenVerifier = (idToken: string) => Promise<GoogleTokenClaims>;

async function defaultVerifyGoogleIdToken(idToken: string): Promise<GoogleTokenClaims> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!res.ok) {
    throw new AuthError('Invalid or expired Google credential.', 401);
  }
  return (await res.json()) as GoogleTokenClaims;
}

/**
 * Signs in or automatically creates a ClauseGuard account using a verified Google ID token.
 */
export async function authenticateWithGoogleIdToken(
  idToken: string,
  verifier: GoogleTokenVerifier = defaultVerifyGoogleIdToken,
): Promise<{ token: string; user: PublicUser }> {
  const trimmed = idToken.trim();
  if (!trimmed) {
    throw new AuthError('Missing Google credential token.', 400);
  }

  const claims = await verifier(trimmed);
  const emailVerified = claims.email_verified === true || claims.email_verified === 'true';
  if (!claims.email || !emailVerified) {
    throw new AuthError('Google account email is missing or unverified.', 401);
  }

  if (
    claims.iss &&
    claims.iss !== 'accounts.google.com' &&
    claims.iss !== 'https://accounts.google.com'
  ) {
    throw new AuthError('Invalid Google token issuer.', 401);
  }

  if (claims.exp && Number(claims.exp) < Math.floor(Date.now() / 1000)) {
    throw new AuthError('Google session expired. Please try again.', 401);
  }

  if (config.googleClientId && claims.aud !== config.googleClientId) {
    throw new AuthError('Google token audience mismatch.', 401);
  }

  const normalizedEmail = claims.email.trim().toLowerCase();
  let user = await findUserByEmail(normalizedEmail);

  const googleFullName = (
    claims.name ||
    [claims.given_name, claims.family_name].filter(Boolean).join(' ') ||
    ''
  ).trim();

  if (!user) {
    const displayName = googleFullName || normalizedEmail.split('@')[0] || 'Google User';
    user = {
      id: uuidv4(),
      name: displayName,
      email: normalizedEmail,
      passwordHash: `google-oauth:${crypto.randomBytes(24).toString('hex')}`,
      createdAt: new Date().toISOString(),
    };
    await saveUser(user);
  } else if (googleFullName && user.name !== googleFullName) {
    user = {
      ...user,
      name: googleFullName,
    };
    await saveUser(user);
  }

  const token = signJwt({
    sub: user.id,
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  });

  return { token, user: toPublicUser(user) };
}
