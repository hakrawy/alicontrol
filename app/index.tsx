import { AuthRouter } from '@/template';
import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import * as subscriptions from '../services/subscriptions';

export default function RootScreen() {
  const [hasSubscriptionSession, setHasSubscriptionSession] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    subscriptions.getSubscriptionSession()
      .then((session) => {
        if (active) setHasSubscriptionSession(Boolean(session));
      })
      .catch(() => {
        if (active) setHasSubscriptionSession(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (hasSubscriptionSession === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  if (hasSubscriptionSession) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <AuthRouter loginRoute="/login">
      <Redirect href="/(tabs)" />
    </AuthRouter>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0F',
  },
});
