import { Tabs } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { useColors } from '../../lib/theme';

export default function TabsLayout() {
  const c = useColors();
  const { profile, pro } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const tabCount = 5 + (pro ? 1 : 0) + (isAdmin ? 1 : 0);
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: c.accent, tabBarInactiveTintColor: c.muted,
      tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line },
      tabBarIconStyle: { display: 'none' },
      tabBarLabelStyle: { fontSize: tabCount > 6 ? 11.5 : tabCount > 5 ? 12.5 : 14, fontWeight: '600' },
      headerStyle: { backgroundColor: c.bg }, headerTitleStyle: { color: c.ink }, headerShadowVisible: false,
      sceneStyle: { backgroundColor: c.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Book', headerTitle: 'Neighbour Fix' }} />
      <Tabs.Screen name="renovate" options={{ title: 'Renovate' }} />
      <Tabs.Screen name="pros" options={{ title: 'Pros' }} />
      <Tabs.Screen name="jobs" options={{ title: 'My jobs' }} />
      <Tabs.Screen name="plans" options={{ title: 'Prices' }} />
      <Tabs.Screen name="work" options={{ title: 'Work', href: pro ? undefined : null }} />
      <Tabs.Screen name="board" options={{ title: 'Board', href: isAdmin ? undefined : null }} />
    </Tabs>
  );
}
