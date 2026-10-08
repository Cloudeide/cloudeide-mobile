/**
 * Connecting to a computer for the first time.
 *
 * The computer shows "Connect … to this computer?" with the same six digits
 * as here. The person checks they match and presses Allow there; this screen
 * waits for that answer and moves on by itself.
 */

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { pairingStatus } from '../../lib/api';
import { Button, colors, s } from '../../components/ui';

export default function Pair() {
  const { id, name, workspace, pairing, code } = useLocalSearchParams<{ id: string; name: string; workspace: string; pairing: string; code: string }>();
  const [status, setStatus] = useState<string>('pending');

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      while (!stopped) {
        try {
          const p = await pairingStatus(Number(pairing));
          if (stopped) return;
          setStatus(p.status);
          if (p.status === 'approved') {
            router.replace({ pathname: '/computer/[id]', params: { id, name, workspace } });
            return;
          }
          if (p.status !== 'pending') return;
        } catch {
          // Keep waiting; a dropped request is not an answer.
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    };
    void check();
    return () => { stopped = true; };
  }, [id, name, workspace, pairing]);

  const digits = (code ?? '').split('');

  return (
    <View style={[s.screen, { padding: 24, justifyContent: 'center' }]}>
      <Text style={[s.muted, { textAlign: 'center' }]}>On {name}, choose Allow if it shows</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 28 }}>
        {digits.map((d, i) => (
          <View key={i} style={{ width: 46, height: 60, borderRadius: 12, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: i === 3 ? 10 : 0 }}>
            <Text style={{ color: colors.text, fontSize: 30, fontWeight: '700' }}>{d}</Text>
          </View>
        ))}
      </View>
      {status === 'pending' ? (
        <Text style={[s.faint, { textAlign: 'center' }]}>Waiting for the computer…</Text>
      ) : (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <Text style={[s.body, { textAlign: 'center', color: colors.del }]}>
            {status === 'denied' ? 'The computer chose Deny.' : 'The request expired before anyone answered.'}
          </Text>
          <Button label="Back to computers" kind="quiet" onPress={() => router.back()} />
        </View>
      )}
      <Text style={[s.faint, { textAlign: 'center', marginTop: 40 }]}>
        CloudeIDE must be open on the computer. You only do this once per computer.
      </Text>
    </View>
  );
}
