import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import * as subscriptions from '../services/subscriptions';
import { PremiumLoader } from '../components/PremiumLoader';

export default function RootScreen() {
  const [target, setTarget] = useState<'login' | 'tabs' | null>(null);

  useEffect(() => {
    let cancelled = false;
    const resolveTarget = async () => {
      const session = await subscriptions.getSubscriptionSession();
      if (cancelled) return;
      setTarget(session ? 'tabs' : 'login');
    };
    void resolveTarget();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!target) {
    return <PremiumLoader />;
  }

  return <Redirect href={target === 'tabs' ? '/(tabs)' : '/login'} />;
}
