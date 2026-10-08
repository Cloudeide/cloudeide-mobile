/**
 * Screen 5 — review, keep or undo, and deploy.
 *
 * The changed files with how much each changed, and the two decisions the
 * desktop chat offers: Keep (save them) or Undo (put them back). Deploy is a
 * task like any other — the agent on the computer has Cloud's tools, and a
 * deploy to the live site still asks for Allow first.
 */

import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useComputerSession } from '../../lib/session';
import { pendingReview } from '../../lib/timeline';
import { Button, Card, colors, mono, s } from '../../components/ui';

export default function Review() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const session = useComputerSession(id, name);
  const review = pendingReview(session.timeline);
  const [busy, setBusy] = useState<string>();
  const [problem, setProblem] = useState<string>();

  const act = async (what: string, kind: string, body: unknown) => {
    setBusy(what);
    setProblem(undefined);
    try {
      await session.send(kind, body);
      router.back();
    } catch (err) {
      setProblem(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(undefined);
    }
  };

  if (!review) {
    return (
      <View style={[s.screen, { padding: 24, justifyContent: 'center' }]}>
        <Text style={s.h2}>Nothing to review</Text>
        <Text style={[s.muted, { marginTop: 8 }]}>The last task's changes were already kept or undone.</Text>
        <Button label="Back" kind="quiet" onPress={() => router.back()} style={{ marginTop: 20, alignSelf: 'flex-start' }} />
      </View>
    );
  }

  const added = review.files.reduce((n, f) => n + f.added, 0);
  const removed = review.files.reduce((n, f) => n + f.removed, 0);

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={s.muted}>
          {review.files.length} {review.files.length === 1 ? 'file' : 'files'} on {name}{'  '}
          <Text style={{ color: colors.add }}>+{added}</Text>{' '}
          <Text style={{ color: colors.del }}>−{removed}</Text>
        </Text>
        <Card style={{ padding: 0 }}>
          {review.files.map((f, i) => (
            <View key={f.path} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderTopColor: colors.border, borderTopWidth: i ? 1 : 0 }}>
              <Text style={[s.body, { flex: 1, fontFamily: mono, fontSize: 14 }]} numberOfLines={1} ellipsizeMode="head">{f.path}</Text>
              <Text style={{ color: colors.add, fontFamily: mono, fontSize: 13 }}>+{f.added}</Text>
              <Text style={{ color: colors.del, fontFamily: mono, fontSize: 13, marginLeft: 8 }}>−{f.removed}</Text>
            </View>
          ))}
        </Card>
        <Text style={s.faint}>The full change is open on the computer, marked in each file.</Text>
      </ScrollView>

      <View style={{ padding: 16, gap: 10 }}>
        {problem ? <Text style={[s.faint, { color: colors.del }]}>{problem}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Keep" onPress={() => void act('keep', 'changes', { keep: true })} busy={busy === 'keep'} disabled={!!busy} style={{ flex: 1 }} />
          <Button label="Undo" kind="quiet" onPress={() => void act('undo', 'changes', { keep: false })} busy={busy === 'undo'} disabled={!!busy} style={{ flex: 1 }} />
        </View>
        <Button
          label="Keep and deploy a preview"
          kind="quiet"
          disabled={!!busy}
          busy={busy === 'deploy'}
          onPress={async () => {
            setBusy('deploy');
            try {
              await session.send('changes', { keep: true });
              await session.send('task', { text: 'Deploy this project to preview and send me the preview link.' });
              router.back();
            } catch (err) {
              setProblem(err instanceof Error ? err.message : String(err));
            } finally {
              setBusy(undefined);
            }
          }}
        />
      </View>
    </View>
  );
}
