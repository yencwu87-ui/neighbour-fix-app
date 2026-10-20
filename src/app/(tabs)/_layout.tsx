import { Tabs } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { useColors } from '../../lib/theme';

export default function TabsLayout() {
  const c = useColors();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: c.accent, tabBarInactiveTintColor: c.muted,
      tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line },
      tabBarIconStyle: { display: 'none' },
      tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
      headerStyle: { backgroundColor: c.bg }, headerTitleStyle: { color: c.ink }, headerShadowVisible: false,
      sceneStyle: { backgroundColor: c.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Book', headerTitle: 'Neighbour Fix' }} />
      <Tabs.Screen name="renovate" options={{ title: 'Renovate' }} />
      <Tabs.Screen name="pros" options={{ title: 'Pros' }} />
      <Tabs.Screen name="jobs" options={{ title: 'My jobs' }} />
      <Tabs.Screen name="plans" options={{ title: 'Prices' }} />
      <Tabs.Screen name="board" options={{ title: 'Board', href: isAdmin ? undefined : null }} />
    </Tabs>
  );
}
