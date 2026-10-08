/**
 * The sign-in screen's picture of what the app does: a task going to the
 * computer, the agent's steps, a question answered with Allow, and the
 * result — on a gently tilted card, looping every nine seconds.
 *
 * Drawn here rather than played as a video: a few kilobytes instead of
 * megabytes, sharp on every screen, and it can stop moving for people who
 * have asked their phone to reduce motion.
 */

import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, mono } from './ui';

const LOOP_MS = 9_000;

/** When each row arrives, as a fraction of the loop. All leave together at the end. */
const ARRIVE = [0.03, 0.13, 0.21, 0.31, 0.55, 0.67];

export function LiveDemo() {
  const t = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loops: Animated.CompositeAnimation[] = [];
    void AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (reduce) {
        // The finished picture, standing still.
        t.setValue(0.8);
        return;
      }
      loops = [
        Animated.loop(Animated.timing(t, { toValue: 1, duration: LOOP_MS, easing: Easing.linear, useNativeDriver: true })),
        Animated.loop(Animated.sequence([
          Animated.timing(float, { toValue: 1, duration: 3_000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(float, { toValue: 0, duration: 3_000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])),
      ];
      loops.forEach(l => l.start());
    });
    return () => loops.forEach(l => l.stop());
  }, [t, float]);

  const row = (i: number) => {
    const a = ARRIVE[i];
    return {
      opacity: t.interpolate({ inputRange: [0, a, a + 0.04, 0.9, 0.97, 1], outputRange: [0, 0, 1, 1, 0, 0] }),
      transform: [{ translateY: t.interpolate({ inputRange: [0, a, a + 0.04, 1], outputRange: [8, 8, 0, 0] }) }],
    };
  };

  const card = {
    transform: [
      { perspective: 900 },
      { rotateX: float.interpolate({ inputRange: [0, 1], outputRange: ['14deg', '10deg'] }) },
      { rotateY: float.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '-4deg'] }) },
      { rotateZ: float.interpolate({ inputRange: [0, 1], outputRange: ['1deg', '0deg'] }) },
      { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
    ],
  };

  // The question is gold while it waits, and plain once Allow is pressed.
  const waiting = { opacity: t.interpolate({ inputRange: [0, 0.47, 0.51, 1], outputRange: [1, 1, 0, 0] }) };
  const press = { transform: [{ scale: t.interpolate({ inputRange: [0, 0.44, 0.46, 0.49, 1], outputRange: [1, 1, 0.92, 1, 1] }) }] };
  const tap = {
    opacity: t.interpolate({ inputRange: [0, 0.4, 0.44, 0.48, 1], outputRange: [0, 0, 1, 0, 0] }),
    transform: [{ scale: t.interpolate({ inputRange: [0, 0.4, 0.44, 0.48, 1], outputRange: [1.6, 1.6, 1, 0.8, 0.8] }) }],
  };
  const glow = { transform: [{ scale: float.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] };

  return (
    <View style={st.stage} accessible accessibilityLabel="An example: a task sent to a computer, the agent's steps, a question answered with Allow, and three files changed.">
      <Animated.View style={[st.glow, glow]}>
        <View style={st.glowInner} />
      </Animated.View>

      <Animated.View style={[st.card, card]}>
        <View style={st.head}>
          <View style={st.dot} />
          <Text style={st.headName}>MacBook Pro</Text>
          <Text style={st.headWs}>acme-app</Text>
        </View>

        <Animated.View style={row(0)}>
          <View style={st.task}><Text style={st.taskText}>Add a pricing section to the homepage</Text></View>
        </Animated.View>
        <Animated.View style={row(1)}><Text style={st.step}>› Reading index.html</Text></Animated.View>
        <Animated.View style={row(2)}><Text style={st.step}>› Editing styles.css</Text></Animated.View>

        <Animated.View style={row(3)}>
          <View style={st.question}>
            <Animated.View style={[StyleSheet.absoluteFill, st.questionGold, waiting]} />
            <Text style={st.qLabel}>MACBOOK PRO IS WAITING</Text>
            <Text style={st.qText}>Run <Text style={{ fontWeight: '700' }}>npm test</Text>?</Text>
            <View style={st.btns}>
              <Animated.View style={[st.btn, st.allow, press]}><Text style={st.allowText}>Allow</Text></Animated.View>
              <View style={st.btn}><Text style={st.btnText}>Skip</Text></View>
              <Animated.View style={[st.tap, tap]} />
            </View>
          </View>
        </Animated.View>

        <Animated.View style={row(4)}><Text style={st.step}>› Running npm test — 24 passed</Text></Animated.View>
        <Animated.View style={row(5)}>
          <View style={st.done}>
            <View style={st.dot} />
            <Text style={st.doneText}>Done · 3 files changed </Text>
            <Text style={[st.count, { color: colors.add }]}>+48 </Text>
            <Text style={[st.count, { color: colors.del }]}>−6</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 24 },
  glow: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(226,176,98,0.05)', alignItems: 'center', justifyContent: 'center' },
  glowInner: { width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(226,176,98,0.06)' },
  card: {
    width: '100%', height: 300, overflow: 'hidden', backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1,
    borderRadius: 20, padding: 14, shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 30, shadowOffset: { width: 0, height: 30 }, elevation: 18,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, marginBottom: 10, borderBottomColor: colors.border, borderBottomWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.add },
  headName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  headWs: { color: colors.text3, fontSize: 11, marginLeft: 'auto' },
  task: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: colors.raised, borderRadius: 14, borderBottomRightRadius: 4, paddingVertical: 8, paddingHorizontal: 11, marginBottom: 9 },
  taskText: { color: colors.text, fontSize: 13 },
  step: { color: colors.text3, fontFamily: mono, fontSize: 11, marginBottom: 5, marginLeft: 2 },
  question: { borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 9, marginVertical: 6, overflow: 'hidden' },
  questionGold: { borderColor: colors.accent, borderWidth: 1, borderRadius: 12 },
  qLabel: { color: colors.accent, fontSize: 9, letterSpacing: 0.6, marginBottom: 4 },
  qText: { color: colors.text, fontSize: 12, marginBottom: 7 },
  btns: { flexDirection: 'row', gap: 6 },
  btn: { flex: 1, alignItems: 'center', borderRadius: 8, paddingVertical: 6, backgroundColor: colors.raised },
  btnText: { color: colors.text, fontSize: 11, fontWeight: '600' },
  allow: { backgroundColor: colors.text },
  allowText: { color: colors.bg, fontSize: 11, fontWeight: '600' },
  tap: { position: 'absolute', left: '22%', top: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(242,242,240,0.35)', borderColor: 'rgba(242,242,240,0.8)', borderWidth: 2 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  doneText: { color: colors.text2, fontSize: 12 },
  count: { fontFamily: mono, fontSize: 11 },
});
