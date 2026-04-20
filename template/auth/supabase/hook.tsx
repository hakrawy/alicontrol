// @ts-nocheck
import { AuthContextType, SendOTPResult, AuthResult, LogoutResult, SignUpResult, GoogleSignInResult } from '../types';
import { configManager } from '../../core/config';
import { useAuthContext } from './context';

function createDisabledAuthStub(): AuthContextType {
  const disabledError = 'Auth function not enabled, please check configuration';

  return {
    currentUser: null,
    user: null,
    authLoading: false,
    loading: false,
    operationLoading: false,
    initialized: true,
    isAuthenticated: false,
    authMethod: null,
    setOperationLoading: () => {},
    sendOTP: async (): Promise<SendOTPResult> => ({ error: disabledError }),
    verifyOTPAndLogin: async (): Promise<AuthResult> => ({ error: disabledError, user: null }),
    signUpWithPassword: async (): Promise<SignUpResult> => ({ error: disabledError, user: null }),
    signInWithPassword: async (): Promise<AuthResult> => ({ error: disabledError, user: null }),
    loginWithPassword: async (): Promise<AuthResult> => ({ error: disabledError, user: null }),
    loginWithSubscriptionCode: async (): Promise<AuthResult> => ({ error: disabledError, user: null }),
    signInWithGoogle: async (): Promise<GoogleSignInResult> => ({ error: disabledError }),
    logout: async (): Promise<LogoutResult> => ({ error: disabledError }),
    refreshSession: async () => {},
    restoreSessionOnRefresh: async () => {},
  };
}

export function useAuth(): AuthContextType {
  const context = useAuthContext();
  const isAuthEnabled = configManager.isModuleEnabled('auth');

  if (!isAuthEnabled) {
    return createDisabledAuthStub();
  }

  return {
    ...context,
    user: context.currentUser ?? context.user,
    currentUser: context.currentUser ?? context.user,
    loading: context.authLoading,
    authLoading: context.authLoading,
    signInWithPassword: context.loginWithPassword,
    loginWithPassword: context.loginWithPassword,
  };
}
