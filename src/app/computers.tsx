/**
 * Screen 2 — the computers on this account.
 *
 * Every computer signed in to the desktop app shows up here by itself; there
 * is nothing to add. Tapping one asks to connect: a computer that already
 * allowed this phone opens straight away, any other shows a code to approve
 * on the computer first.
 */

import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { listComputers, requestPairing, signOut, type Computer } from '../lib/api';
import { phoneId, phoneName } from '../lib/phone';
import { forgetSessions } from '../lib/session';
import { Button, Card, colors, s } from '../components/ui';

function ago(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

export default function Computers() {
  const [computers, setComputers] = useState<Computer[]>();
  const [problem, setProblem] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [opening, setOpening] = useState<string>();

  const load = useCallback(async () => {
    try {
      setComputers(await listComputers());
      setProblem(undefined);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : String(err));
      if ((err as { status?: number }).status === 401) {
        await signOut();
        router.replace('/');
      }
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Online dots go stale; a quiet refresh while the list is open keeps them honest.
  useEffect(() => {
    const timer = setInterval(() => { void load(); }, 15_000);
    return () => clearInterval(timer);
  }, [load]);

  const open = async (c: Computer) => {
    setOpening(c.publicId);
    try {
      const pairing = await requestPairing(c.publicId, await phoneId(), phoneName());
      if (pairing.status === 'approved') {
        router.push({ pathname: '/computer/[id]', params: { id: c.publicId, name: c.name, workspace: c.workspace ?? '' } });
      } else {
        router.push({ pathname: '/pair/[id]', params: { id: c.publicId, name: c.name, workspace: c.workspace ?? '', pairing: String(pairing.id), code: pairing.code } });
      }
    } catch (err) {
      Alert.alert('Could not connect', err instanceof Error ? err.message : String(err));
    } finally {
      setOpening(undefined);
    }
  };

  const leave = () => {
    Alert.alert('Sign out?', 'Computers will need to allow this phone again after you sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await signOut(); forgetSessions(); router.replace('/'); } },
    ]);
  };

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ headerRight: () => <Pressable onPress={leave} hitSlop={12}><Text style={s.muted}>Sign out</Text></Pressable> }} />
      <FlatList
        data={computers ?? []}
        keyExtractor={c => c.publicId}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl tintColor={colors.text2} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListHeaderComponent={problem ? <Text style={[s.muted, { color: colors.del, marginBottom: 4 }]}>{problem}</Text> : null}
        ListEmptyComponent={computers ? (
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 8 }}>
            <Text style={s.h2}>No computers yet</Text>
            <Text style={[s.muted, { marginTop: 8 }]}>
              Open CloudeIDE on your computer and sign in with this same account. It shows up here within a minute.
            </Text>
            <Button label="Refresh" kind="quiet" onPress={() => void load()} style={{ marginTop: 20, alignSelf: 'flex-start' }} />
          </View>
        ) : null}
        renderItem={({ item: c }) => (
          <Pressable onPress={() => void open(c)} disabled={!!opening} style={({ pressed }) => pressed && { opacity: 0.85 }}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.online ? colors.online : colors.text3 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.h2}>{c.name}</Text>
                <Text style={[s.faint, { marginTop: 3 }]}>
                  {c.workspace ? `${c.workspace} · ` : ''}{c.online ? 'Online' : `Seen ${ago(c.lastSeenAt)}`}
                </Text>
              </View>
              <Text style={[s.muted, { fontSize: 22 }]}>{opening === c.publicId ? '…' : '›'}</Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
