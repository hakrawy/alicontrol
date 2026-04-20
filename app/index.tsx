import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { PremiumLoader } from '../components/PremiumLoader';
import { useAuth } from '@/template';

export default function RootScreen() {
  const router = useRouter();
  const { isAuthenticated, authLoading, initialized, restoreSessionOnRefresh } = useAuth();
  const ready = initialized && !authLoading;

  useEffect(() => {
    void restoreSessionOnRefresh();
  }, [restoreSessionOnRefresh]);

  useEffect(() => {
    if (!ready) return;
    if (isAuthenticated) {
      router.replace('/(tabs)');
      return;
    }
    router.replace('/login');
  }, [isAuthenticated, ready, router]);

  if (!ready) {
    return <PremiumLoader />;
  }

  return null;
}
