import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/splash/SplashScreen';
import { colors } from './src/theme';
import { requestNotificationPermissions } from './src/utils/notifications';
import { useStore } from './src/store';

const NAV_THEME = {
  dark: true,
  colors: {
    primary: colors.accent,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const checkResets = useStore(s => s.checkResets);

  useEffect(() => {
    requestNotificationPermissions();
    checkResets();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') checkResets();
    });
    return () => sub.remove();
  }, []); // eslint-disable-line

  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={NAV_THEME}>
        <StatusBar style="light" backgroundColor={colors.bg} />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
