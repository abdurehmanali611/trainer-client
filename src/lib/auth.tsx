import * as React from 'react';
import { api, ApiError, clearTokens, loadTokens, saveTokens } from '@/lib/api';
import type { BillingPayload, ClientProfile, LoginResponse } from '@/lib/types';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'blocked';

interface AuthState {
  status: AuthStatus;
  client: { id: number; name: string; phone: string; email: string; mode: string; avatar_url: string } | null;
  mustChangeCredential: boolean;
  /** Present when status === 'blocked' (from a fresh login attempt). */
  blockedBilling: BillingPayload | null;
  blockedReason: string | null;
  blockedPhone: string | null;
}

interface AuthContextValue extends AuthState {
  /** OTP credential only. Throws ApiError with body containing blocked:true when locked. */
  signIn: (credential: string) => Promise<LoginResponse>;
  signOut: () => Promise<void>;
  setMustChangeCredential: (v: boolean) => void;
  setClient: (client: AuthState['client']) => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    status: 'loading',
    client: null,
    mustChangeCredential: false,
    blockedBilling: null,
    blockedReason: null,
    blockedPhone: null,
  });

  React.useEffect(() => {
    let cancelled = false;
    const BOOT_MS = 10_000;
    const signedOut: AuthState = {
      status: 'signedOut',
      client: null,
      mustChangeCredential: false,
      blockedBilling: null,
      blockedReason: null,
      blockedPhone: null,
    };

    (async () => {
      const boot = (async (): Promise<AuthState> => {
        const tokens = await loadTokens();
        if (tokens.access) {
          try {
            const me = await api<ClientProfile>('client/me/');
            return {
              status: 'signedIn',
              client: {
                id: me.id,
                name: me.name,
                phone: me.phone,
                email: me.email,
                mode: me.mode,
                avatar_url: me.avatar_url,
              },
              mustChangeCredential: false,
              blockedBilling: null,
              blockedReason: null,
              blockedPhone: null,
            };
          } catch {
            await clearTokens();
          }
        }
        return signedOut;
      })();

      const timeout = new Promise<AuthState>((resolve) => {
        setTimeout(() => resolve(signedOut), BOOT_MS);
      });

      try {
        const next = await Promise.race([boot, timeout]);
        if (!cancelled) setState(next);
      } catch {
        if (!cancelled) setState(signedOut);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = React.useCallback(async (credential: string) => {
    let res: LoginResponse;
    try {
      res = await api<LoginResponse>('auth/client-login/', {
        method: 'POST',
        body: { credential },
        auth: false,
      });
    } catch (e) {
      // Feature 15: a post-deadline login answers 403 {blocked: true, ...}.
      // Handle it here so status becomes 'blocked' and the root layout
      // routes to /lock (the payment portal) — swallowing it in the login
      // screen instead would leave status 'signedOut' and bounce back to
      // the login form.
      if (e instanceof ApiError && e.body?.blocked) {
        const body = e.body as { reason?: string; phone?: string; billing?: BillingPayload };
        setState({
          status: 'blocked',
          client: null,
          mustChangeCredential: false,
          blockedBilling: body.billing ?? null,
          blockedReason: body.reason ?? body.billing?.access.state ?? null,
          blockedPhone: body.phone ?? null,
        });
        return { blocked: true, reason: body.reason, billing: body.billing };
      }
      throw e;
    }
    if (res.blocked) {
      setState({
        status: 'blocked',
        client: null,
        mustChangeCredential: false,
        blockedBilling: res.billing ?? null,
        blockedReason: res.reason ?? res.billing?.access.state ?? null,
        blockedPhone: (res as { phone?: string }).phone ?? null,
      });
      return res;
    }
    if (res.access && res.refresh) {
      await saveTokens(res.access, res.refresh);
    }
    setState({
      status: 'signedIn',
      client: res.client ?? null,
      mustChangeCredential: res.must_change_credential ?? false,
      blockedBilling: null,
      blockedReason: null,
      blockedPhone: null,
    });
    return res;
  }, []);

  const signOut = React.useCallback(async () => {
    await clearTokens();
    setState({
      status: 'signedOut',
      client: null,
      mustChangeCredential: false,
      blockedBilling: null,
      blockedReason: null,
      blockedPhone: null,
    });
  }, []);

  const setMustChangeCredential = React.useCallback((v: boolean) => {
    setState((s) => ({ ...s, mustChangeCredential: v }));
  }, []);

  const setClient = React.useCallback((client: AuthState['client']) => {
    setState((s) => ({ ...s, client }));
  }, []);

  const value = React.useMemo(
    () => ({ ...state, signIn, signOut, setMustChangeCredential, setClient }),
    [state, signIn, signOut, setMustChangeCredential, setClient]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
