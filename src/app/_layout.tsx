import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../components/ui';

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="computers" options={{ title: 'Computers', headerBackVisible: false }} />
        <Stack.Screen name="pair/[id]" options={{ title: 'Connect' }} />
        <Stack.Screen name="computer/[id]" options={{ title: '' }} />
        <Stack.Screen name="review/[id]" options={{ title: 'Review', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
