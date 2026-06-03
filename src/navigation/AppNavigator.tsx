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

function TabIcon({ name, focused, color }: { name: IconName; focused: boolean; color: string }) {
  return (
    <View style={[s.iconWrap, focused && s.iconWrapActive]}>
      <Ionicons name={name} size={20} color={color} />
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
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom + 4,
            paddingTop: 6,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '500' as const, marginTop: 1 },
          tabBarLabel: cfg.label,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? cfg.active : cfg.inactive}
              focused={focused}
              color={color}
            />
          ),
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
    width: 40,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.accentDim,
  },
});
