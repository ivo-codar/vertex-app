import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabParamList } from '../types';
import { colors } from '../theme';
import ErrorBoundary from '../components/ErrorBoundary';
import HomeScreen     from '../screens/home/HomeScreen';
import GymScreen      from '../screens/gym/GymScreen';
import DeepWorkScreen from '../screens/deepwork/DeepWorkScreen';
import ProjectsScreen from '../screens/projects/ProjectsScreen';
import ProgressScreen from '../screens/progress/ProgressScreen';

const Tab = createBottomTabNavigator<TabParamList>();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<keyof TabParamList, { label: string; active: IconName; inactive: IconName }> = {
  Home:     { label: 'Home',     active: 'grid',        inactive: 'grid-outline' },
  Gym:      { label: 'Gym',      active: 'barbell',     inactive: 'barbell-outline' },
  DeepWork: { label: 'Focus',    active: 'timer',       inactive: 'timer-outline' },
  Projects: { label: 'Projects', active: 'layers',      inactive: 'layers-outline' },
  Progress: { label: 'Progress', active: 'stats-chart', inactive: 'stats-chart-outline' },
};

function TabIcon({
  name, focused, color,
}: { name: IconName; focused: boolean; color: string }) {
  return (
    <View style={[s.iconWrap, focused && s.iconWrapActive]}>
      {/* Gold indicator line above active tab — Stark HUD style */}
      {focused && <View style={s.indicator} />}
      <Ionicons name={name} size={focused ? 23 : 21} color={color} />
    </View>
  );
}

function wrap(Screen: React.ComponentType, label: string) {
  return () => (
    <ErrorBoundary label={label}>
      <Screen />
    </ErrorBoundary>
  );
}

export default function AppNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const cfg = TAB_CONFIG[route.name as keyof TabParamList];
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'rgba(10, 10, 20, 0.96)',
            borderTopColor: 'rgba(200, 150, 12, 0.28)',
            borderTopWidth: 1,
            height: 64 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 10),
            paddingTop: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.35,
            shadowRadius: 18,
            elevation: 12,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSub,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600' as const,
            marginTop: 3,
            letterSpacing: 0.2,
          },
          tabBarLabel: cfg.label,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? cfg.active : cfg.inactive}
              focused={focused}
              color={color}
            />
          ),
          tabBarIconStyle: { marginBottom: -2 },
        };
      }}
    >
      <Tab.Screen name="Home"     component={wrap(HomeScreen,     'Home')} />
      <Tab.Screen name="Gym"      component={wrap(GymScreen,      'Gym')} />
      <Tab.Screen name="DeepWork" component={wrap(DeepWorkScreen, 'Focus')} />
      <Tab.Screen name="Projects" component={wrap(ProjectsScreen, 'Projects')} />
      <Tab.Screen name="Progress" component={wrap(ProgressScreen, 'Progress')} />
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 46,
    height: 32,
    gap: 4,
  },
  iconWrapActive: {
    borderRadius: 16,
    backgroundColor: colors.accentDim,
  },
  // Thin gold line above the active icon — like a Stark UI selector
  indicator: {
    position: 'absolute',
    top: 0,
    width: 22,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accent,
    // subtle glow effect via shadow
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
