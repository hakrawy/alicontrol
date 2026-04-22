import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, useWindowDimensions } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export function useAdaptivePerformance() {
  const { width } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isConnectionWeak, setConnectionWeak] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => null);
    const motionSub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    const netSub = NetInfo.addEventListener((state) => {
      const cellular = state.type === 'cellular';
      const expensive = Boolean(state.details && 'isConnectionExpensive' in state.details && state.details.isConnectionExpensive);
      setConnectionWeak(cellular || expensive || state.isInternetReachable === false);
    });
    return () => {
      motionSub?.remove?.();
      netSub();
    };
  }, []);

  const compact = width < 680;
  const lowPowerVisuals = reduceMotion || isConnectionWeak || compact && Platform.OS !== 'web';

  return {
    compact,
    isWide: width >= 900,
    reduceMotion,
    isConnectionWeak,
    lowPowerVisuals,
    animationDuration: lowPowerVisuals ? 120 : 320,
    imageTransition: lowPowerVisuals ? 0 : 220,
    blurEnabled: !lowPowerVisuals,
  };
}
