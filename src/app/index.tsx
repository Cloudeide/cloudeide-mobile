/**
 * Screen 1 — signing in.
 *
 * Skipped when a token is already kept. Sign-in itself happens in the
 * browser, on the same page the desktop app uses, so there is no password
 * field here to type into.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getToken } from '../lib/api';
import { signIn } from '../lib/auth';
import { enableNotifications } from '../lib/notify';
import { Button, colors, Logo, s } from '../components/ui';

export default function SignIn() {
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  useEffect(() => {
    void getToken().then(token => {
      if (token) {
        router.replace('/computers');
      } else {
        setChecking(false);
      }
    });
  }, []);

  const start = async () => {
    setBusy(true);
    setProblem(undefined);
    const result = await signIn();
    setBusy(false);
    if (result.ok) {
      void enableNotifications();
      router.replace('/computers');
    } else if (!result.cancelled) {
      setProblem(result.message);
    }
  };

  if (checking) {
    return <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={colors.text} /></View>;
  }

  return (
    <SafeAreaView style={[s.screen, { paddingHorizontal: 24 }]}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <Logo size={44} />
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>CloudeIDE</Text>
        </View>
        <Text style={[s.h1, { fontSize: 38, lineHeight: 44 }]}>Your agent,{'\n'}in your pocket.</Text>
        <Text style={[s.muted, { marginTop: 16, fontSize: 17, lineHeight: 25 }]}>
          Send a task to CloudeIDE on your computer, watch every step, answer its questions, and keep or undo the result.
        </Text>
      </View>
      <View style={{ paddingBottom: 24, gap: 12 }}>
        {problem ? <Text style={[s.muted, { color: colors.del }]}>{problem}</Text> : null}
        <Button label="Sign in" onPress={start} busy={busy} />
        <Text style={[s.faint, { textAlign: 'center' }]}>
          Use the same account as the desktop app. Sign-in opens in the browser.
        </Text>
      </View>
    </SafeAreaView>
  );
}
