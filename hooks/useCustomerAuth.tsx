import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  clearAuthTokens,
  consumeAuthNotice,
  getAuthToken,
  getRefreshToken,
  getStoredProfile,
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
  logout: () => Promise<void>;
  sessionNotice: string;
  consumeSessionNotice: () => string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function notifyWelcomeEmail(payload: unknown) {
  void payload;
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
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        if (token) {
          const profile = await fetchCustomerProfile();
          storeAuthTokens({ accessToken: token, profile });
          setState({ user: profile, loading: false, error: null, sessionNotice: consumeAuthNotice() });
          return;
        }

        const response = await customerRefreshSession(refreshToken || '');
        storeAuthTokens({
          accessToken: response?.access_token,
          refreshToken: response?.refresh_token,
          profile: response?.user,
        });
        setState({
          user: response?.user || null,
          loading: false,
          error: null,
          sessionNotice: consumeAuthNotice(),
        });
      } catch {
        clearAuthTokens();
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
          const response = await customerLogin(credentials);
          storeAuthTokens({
            accessToken: response?.access_token,
            refreshToken: response?.refresh_token,
            profile: response?.user,
          });
          setState({
            user: response?.user || null,
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
          const response = await customerSignup(payload);
          storeAuthTokens({
            accessToken: response?.access_token,
            refreshToken: response?.refresh_token,
            profile: response?.user,
          });
          setState({
            user: response?.user || null,
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

