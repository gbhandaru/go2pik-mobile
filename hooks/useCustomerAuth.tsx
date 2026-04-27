import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  clearAuthTokens,
  clearCustomerGuestAccess,
  consumeAuthNotice,
  getAuthToken,
  getRefreshToken,
  getStoredProfile,
  hasCustomerGuestAccess,
  setCustomerGuestAccess,
  storeAuthTokens,
} from '@/lib/auth-storage';
import {
  customerLogin,
  customerLogout,
  customerRefreshSession,
  customerSignup,
  fetchCustomerProfile,
} from '@/lib/api/auth';

type AuthContextValue = {
  user: unknown | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: Record<string, unknown>) => Promise<unknown>;
  signup: (payload: Record<string, unknown>) => Promise<unknown>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
  sessionNotice: string;
  consumeSessionNotice: () => string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function notifyWelcomeEmail(payload: unknown) {
  void payload;
}

function resolveCustomerProfile(response: unknown) {
  if (!response || typeof response !== 'object') {
    return null;
  }

  const record = response as Record<string, unknown>;
  return record.user || record.customer || record.profile || null;
}

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({
    user: getStoredProfile(),
    loading: true,
    error: null as string | null,
    sessionNotice: '',
  });

  useEffect(() => {
    async function hydrate() {
      const token = getAuthToken();
      const refreshToken = getRefreshToken();

      if (!token && !refreshToken) {
        const guestMode = hasCustomerGuestAccess();
        setState((prev) => ({
          ...prev,
          loading: false,
          sessionNotice: consumeAuthNotice(),
          user: guestMode ? prev.user : null,
        }));
        return;
      }

      try {
        if (token) {
          const profileResponse = await fetchCustomerProfile();
          const profile = resolveCustomerProfile(profileResponse) || profileResponse;
          storeAuthTokens({ accessToken: token, profile });
          setState({ user: profile, loading: false, error: null, sessionNotice: consumeAuthNotice() });
          return;
        }

        const response = await customerRefreshSession(refreshToken || '');
        const profile = resolveCustomerProfile(response);
        storeAuthTokens({
          accessToken: response?.access_token,
          refreshToken: response?.refresh_token,
          profile,
        });
        setState({
          user: profile,
          loading: false,
          error: null,
          sessionNotice: consumeAuthNotice(),
        });
      } catch {
        clearAuthTokens();
        clearCustomerGuestAccess();
        setState({ user: null, loading: false, error: null, sessionNotice: consumeAuthNotice() });
      }
    }

    hydrate();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      loading: state.loading,
      error: state.error,
      isAuthenticated: Boolean(state.user),
      sessionNotice: state.sessionNotice,
      consumeSessionNotice: () => {
        const message = consumeAuthNotice();
        setState((prev) => ({ ...prev, sessionNotice: message }));
        return message;
      },
      login: async (credentials) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
          clearCustomerGuestAccess();
          const normalizedCredentials = {
            ...credentials,
            email: typeof credentials.email === 'string' ? credentials.email.trim() : credentials.email,
          };
          const response = await customerLogin(normalizedCredentials);
          const profile = resolveCustomerProfile(response);
          storeAuthTokens({
            accessToken: response?.access_token,
            refreshToken: response?.refresh_token,
            profile,
          });
          setState({
            user: profile,
            loading: false,
            error: null,
            sessionNotice: '',
          });
          return response;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to sign in';
          setState({ user: null, loading: false, error: message, sessionNotice: '' });
          throw error;
        }
      },
      signup: async (payload) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
          clearCustomerGuestAccess();
          const normalizedPayload = {
            ...payload,
            email: typeof payload.email === 'string' ? payload.email.trim() : payload.email,
            full_name: typeof payload.full_name === 'string' ? payload.full_name.trim() : payload.full_name,
          };
          const response = await customerSignup(normalizedPayload);
          const profile = resolveCustomerProfile(response);
          storeAuthTokens({
            accessToken: response?.access_token,
            refreshToken: response?.refresh_token,
            profile,
          });
          setState({
            user: profile,
            loading: false,
            error: null,
            sessionNotice: '',
          });
          notifyWelcomeEmail(response);
          return response;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to create account';
          setState({ user: null, loading: false, error: message, sessionNotice: '' });
          throw error;
        }
      },
      continueAsGuest: () => {
        clearAuthTokens();
        setCustomerGuestAccess(true);
        setState({ user: null, loading: false, error: null, sessionNotice: '' });
      },
      logout: async () => {
        const refreshToken = getRefreshToken();
        try {
          if (refreshToken) {
            await customerLogout(refreshToken);
          }
        } catch (error) {
          console.warn('Failed to notify server about logout', error);
        }
        clearAuthTokens();
        clearCustomerGuestAccess();
        setState({ user: null, loading: false, error: null, sessionNotice: '' });
      },
    }),
    [state.user, state.loading, state.error, state.sessionNotice],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useCustomerAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  }
  return ctx;
}
