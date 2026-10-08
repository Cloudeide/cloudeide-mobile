/**
 * Screens 3 and 4 — a new task, and the agent working on it.
 *
 * One conversation per computer. The box at the bottom sends a task (typed,
 * or spoken with the keyboard's microphone); above it, everything the
 * computer reports comes in as it happens: the task, each step, the reply as
 * it is written, a question when a command waits for Allow, and the result.
 */

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useComputerSession } from '../../lib/session';
import { pendingReview, type Item } from '../../lib/timeline';
import { Button, Card, colors, mono, s } from '../../components/ui';

/** Short ways in, for the things people send most. Each is just text in the box. */
const STARTERS = ['Run the tests and fix what fails', 'Explain what changed today', 'Deploy a preview'];

export default function ComputerChat() {
  const { id, name, workspace } = useLocalSearchParams<{ id: string; name: string; workspace?: string }>();
  const session = useComputerSession(id, name);
  const { timeline } = session;
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string>();
  const list = useRef<FlatList<Item>>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (session.notAllowed) {
      router.replace('/computers');
    }
  }, [session.notAllowed]);

  const sendTask = async () => {
    const task = text.trim();
    if (!task || sending) return;
    setSending(true);
    setProblem(undefined);
    try {
      await session.send('task', { text: task });
      setText('');
    } catch (err) {
      setProblem(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  const tell = (kind: string, body: unknown) => {
    session.send(kind, body).catch(err => setProblem(err instanceof Error ? err.message : String(err)));
  };

  const review = pendingReview(timeline);

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View>
              <Text style={s.h2}>{name}</Text>
              {workspace ? <Text style={s.faint}>{workspace}</Text> : null}
            </View>
          ),
          headerRight: () => timeline.running
            ? <Pressable onPress={() => tell('stop', {})} hitSlop={12}><Text style={[s.muted, { color: colors.del }]}>Stop</Text></Pressable>
            : null,
        }}
      />

      <FlatList
        ref={list}
        data={[...timeline.items]}
        keyExtractor={item => item.key}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        ListEmptyComponent={session.loaded ? (
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 8 }}>
            <Text style={s.h2}>What should the agent do?</Text>
            <Text style={[s.muted, { marginTop: 6 }]}>
              It works on {workspace || 'the open folder'} on {name}, with the same tools and questions as there.
            </Text>
            <View style={{ marginTop: 16, gap: 8 }}>
              {STARTERS.map(starter => (
                <Pressable key={starter} onPress={() => setText(starter)}>
                  <Card style={{ paddingVertical: 12 }}><Text style={s.body}>{starter}</Text></Card>
                </Pressable>
              ))}
            </View>
          </View>
        ) : <ActivityIndicator color={colors.text2} style={{ marginTop: 40 }} />}
        renderItem={({ item }) => <Row item={item} name={name} onAnswer={(ref, choice) => tell('answer', { ref, choice })} onReview={() => router.push({ pathname: '/review/[id]', params: { id, name } })} />}
        ListFooterComponent={timeline.running ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={s.faint}>Working on {name}…</Text>
          </View>
        ) : null}
      />

      {review && !timeline.running ? (
        <Pressable onPress={() => router.push({ pathname: '/review/[id]', params: { id, name } })} style={{ marginHorizontal: 16, marginBottom: 8 }}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderColor: colors.accent }}>
            <Text style={[s.body, { flex: 1 }]}>{review.files.length} {review.files.length === 1 ? 'file' : 'files'} changed — review</Text>
            <Text style={[s.body, { color: colors.accent }]}>›</Text>
          </Card>
        </Pressable>
      ) : null}

      {problem || session.problem ? <Text style={[s.faint, { color: colors.del, paddingHorizontal: 16, paddingBottom: 6 }]}>{problem ?? session.problem}</Text> : null}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12), borderTopColor: colors.border, borderTopWidth: 1 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={timeline.running ? 'Wait for this task, or Stop it' : 'Describe a task — or use the keyboard mic'}
          placeholderTextColor={colors.text3}
          multiline
          style={{ flex: 1, maxHeight: 140, minHeight: 46, color: colors.text, fontSize: 16, backgroundColor: colors.panel, borderRadius: 14, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, borderColor: colors.border, borderWidth: 1 }}
        />
        <Button label="Send" onPress={sendTask} busy={sending} disabled={!text.trim() || timeline.running} style={{ minHeight: 46 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Row({ item, name, onAnswer, onReview }: { item: Item; name: string; onAnswer: (ref: string, choice: string) => void; onReview: () => void }) {
  switch (item.type) {
    case 'task':
      return (
        <View style={{ alignSelf: 'flex-end', maxWidth: '86%', backgroundColor: colors.raised, borderRadius: 16, borderBottomRightRadius: 4, padding: 12, marginTop: 8 }}>
          <Text style={s.body}>{item.text}</Text>
        </View>
      );

    case 'step':
      return (
        <View style={{ flexDirection: 'row', gap: 8, paddingLeft: 4 }}>
          <Text style={{ color: colors.text3, fontFamily: mono }}>›</Text>
          <Text style={[s.faint, { flex: 1, fontFamily: mono, fontSize: 13 }]} numberOfLines={2}>{item.text}</Text>
        </View>
      );

    case 'reply':
      return <Text style={[s.body, { paddingHorizontal: 4 }]}>{item.text}</Text>;

    case 'question':
      return (
        <Card style={{ borderColor: item.open ? colors.accent : colors.border, gap: 10 }}>
          <Text style={[s.faint, { color: item.open ? colors.accent : colors.text3, textTransform: 'uppercase', letterSpacing: 0.6 }]}>
            {item.open ? `${name} is waiting` : 'Answered'}
          </Text>
          <Text style={s.body}>{item.text}</Text>
          {item.detail ? <Text style={[s.faint, { fontFamily: mono }]} numberOfLines={6}>{item.detail}</Text> : null}
          {item.open ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {item.options.map((option, i) => (
                <Button key={option} label={option} kind={i === 0 ? 'primary' : 'quiet'} onPress={() => onAnswer(item.ref, option)} style={{ flex: 1 }} />
              ))}
            </View>
          ) : null}
        </Card>
      );

    case 'done': {
      const label = item.status === 'completed' ? 'Done' : item.status === 'cancelled' ? 'Stopped' : 'Failed';
      return (
        <Pressable onPress={item.files.length ? onReview : undefined}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingVertical: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.status === 'completed' ? colors.add : item.status === 'cancelled' ? colors.text3 : colors.del }} />
            <Text style={s.faint}>
              {label}
              {item.files.length ? ` · ${item.files.length} ${item.files.length === 1 ? 'file' : 'files'} changed` : ''}
              {item.outcome ? ` · ${item.outcome}` : ''}
              {item.error ? ` · ${item.error}` : ''}
            </Text>
          </View>
        </Pressable>
      );
    }

    case 'notice':
      return <Text style={[s.faint, { color: item.tone === 'error' ? colors.del : colors.text2, paddingHorizontal: 4 }]}>{item.text}</Text>;
  }
}
