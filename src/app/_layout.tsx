import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/auth';
import { useColors } from '../lib/theme';

export const unstable_settings = { anchor: '(tabs)' };

function Nav() {
  const c = useColors();
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerTintColor: c.accent, headerStyle: { backgroundColor: c.bg }, headerTitleStyle: { color: c.ink }, contentStyle: { backgroundColor: c.bg }, headerBackTitle: 'Back' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Back' }} />
        <Stack.Screen name="sign-in" options={{ title: 'Sign in', presentation: 'modal' }} />
        <Stack.Screen name="request" options={{ title: 'Book a job' }} />
        <Stack.Screen name="join" options={{ title: 'Join as a pro' }} />
        <Stack.Screen name="job/[id]" options={{ title: 'Job' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Nav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
