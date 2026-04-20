// @ts-nocheck
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from './hook';

const DefaultLoadingScreen = () => (
  <View style={styles.defaultContainer}>
    <Text style={styles.defaultText}>Loading...</Text>
  </View>
);

interface AuthRouterProps {
  children: React.ReactNode;
  loginRoute?: string;
  loadingComponent?: React.ComponentType;
  excludeRoutes?: string[];
}

export function AuthRouter({
  children,
  loginRoute = '/login',
  loadingComponent: LoadingComponent = DefaultLoadingScreen,
  excludeRoutes = [],
}: AuthRouterProps) {
  const { isAuthenticated, authLoading, initialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isReady = initialized && !authLoading;
  const isLoginRoute = pathname === loginRoute || pathname?.startsWith(`${loginRoute}/`);
  const isExcludedRoute = excludeRoutes.some((route) => pathname?.startsWith(route));
  const shouldRedirectToLogin = isReady && !isAuthenticated && !isLoginRoute && !isExcludedRoute;
  const shouldRedirectToHome = isReady && isAuthenticated && isLoginRoute;

  useEffect(() => {
    if (shouldRedirectToLogin) {
      router.replace(loginRoute);
      return;
    }

    if (shouldRedirectToHome) {
      router.replace('/(tabs)');
    }
  }, [loginRoute, router, shouldRedirectToHome, shouldRedirectToLogin]);

  if (!isReady) {
    return <LoadingComponent />;
  }

  if (shouldRedirectToLogin || shouldRedirectToHome) {
    return <LoadingComponent />;
  }

  if (!isAuthenticated && !isLoginRoute && !isExcludedRoute) {
    return <LoadingComponent />;
  }

  return <>{children}</>;
}

export const AuthGuard = AuthRouter;

const styles = StyleSheet.create({
  defaultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  defaultText: {
    fontSize: 18,
    color: '#6B7280',
  },
});
