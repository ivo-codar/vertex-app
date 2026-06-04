import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// ── Boot sequence ─────────────────────────────────────────────────────────────

const SEQ = [
  { text: 'SYSTEM UPLINK ESTABLISHED...',                             speed: 48, pause: 700  },
  { text: '',                                                          speed: 0,  pause: 100  },
  { text: 'INITIALIZING  V.E.R.T.E.X.',                              speed: 55, pause: 350  },
  { text: '[Virtual Environment for Routine & Tactical Execution X]', speed: 22, pause: 700, dim: true },
  { text: '',                                                          speed: 0,  pause: 200  },
  { text: 'SYNCING PERFORMANCE METRICS...',                           speed: 42, pause: 300  },
  { text: 'O.R.A.C.L.E. COACHING PROTOCOL: ONLINE',                  speed: 42, pause: 900  },
  { text: '',                                                          speed: 0,  pause: 150  },
];

const AMBER  = '#E09B00';
const AMBER2 = '#C8960C';
const BG     = '#06060C';

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onFinish: () => void; }
type Line = { text: string; dim?: boolean };

export default function SplashScreen({ onFinish }: Props) {
  const [lines, setLines]           = useState<Line[]>([]);
  const [typing, setTyping]         = useState('');
  const [cursorOn, setCursorOn]     = useState(true);
  const [showCursor, setShowCursor] = useState(true);
  const [awaiting, setAwaiting]     = useState(false);   // AWAITING COMMAND. is ready
  const [accessed, setAccessed]     = useState(false);   // user tapped it
  const fadeAnim                    = useRef(new Animated.Value(1)).current;
  const pulseAnim                   = useRef(new Animated.Value(0)).current;
  const ran                         = useRef(false);

  // Cursor blink
  useEffect(() => {
    const id = setInterval(() => setCursorOn(v => !v), 530);
    return () => clearInterval(id);
  }, []);

  // Pulse loop for AWAITING COMMAND button
  useEffect(() => {
    if (!awaiting) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1100, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1100, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [awaiting]); // eslint-disable-line

  const pulseColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(200,150,12,0.12)', 'rgba(200,150,12,0.35)'],
  });

  const pulseGlow = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(200,150,12,0.4)', 'rgba(200,150,12,1)'],
  });

  // Boot sequence
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      for (const step of SEQ) {
        if (step.text === '') {
          setLines(p => [...p, { text: '' }]);
          await wait(step.pause);
          continue;
        }
        setShowCursor(true);
        for (let i = 0; i <= step.text.length; i++) {
          setTyping(step.text.slice(0, i));
          await wait(step.speed);
        }
        setShowCursor(false);
        setLines(p => [...p, { text: step.text, dim: step.dim }]);
        setTyping('');
        await wait(step.pause);
      }
      // Reveal AWAITING COMMAND. as interactive button
      setAwaiting(true);
    })();
  }, []); // eslint-disable-line

  const handleCommand = async () => {
    if (accessed) return;
    setAccessed(true);
    setAwaiting(false);
    // Brief "ACCESS GRANTED" flash
    setLines(p => [...p, { text: '', }, { text: '>>> ACCESS GRANTED <<<' }]);
    await wait(600);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: false,
    }).start(() => onFinish());
  };

  return (
    <Animated.View style={[s.root, { opacity: fadeAnim }]}>
      <StatusBar style="light" backgroundColor={BG} />
      <View style={s.terminal}>

        {lines.map((line, i) =>
          line.text === '' ? (
            <View key={i} style={s.blank} />
          ) : line.text === '>>> ACCESS GRANTED <<<' ? (
            <Text key={i} style={s.granted}>{line.text}</Text>
          ) : (
            <Text key={i} style={[s.line, line.dim && s.dim]}>
              {'> '}{line.text}
            </Text>
          )
        )}

        {/* Currently typing */}
        {typing !== '' && (
          <Text style={s.line}>
            {'> '}{typing}
            {showCursor && <Text style={[s.cursor, cursorOn && s.cursorOn]}>█</Text>}
          </Text>
        )}

        {/* AWAITING COMMAND — interactive button */}
        {awaiting && (
          <>
            <View style={s.blank} />
            <TouchableOpacity onPress={handleCommand} activeOpacity={0.75}>
              <Animated.View style={[s.awaitingWrap, { backgroundColor: pulseColor, borderColor: pulseGlow }]}>
                <Animated.Text style={[s.awaitingText, { color: pulseGlow as any }]}>
                  {'> AWAITING COMMAND.'}
                </Animated.Text>
                <Text style={s.awaitingHint}>[TAP TO PROCEED]</Text>
              </Animated.View>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const GLOW = {
  textShadowColor: AMBER,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 6,
};

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 60,
  },
  terminal: { gap: 1 },
  line: {
    fontFamily: 'Courier New, Courier, monospace',
    fontSize: 13, lineHeight: 22,
    color: AMBER, letterSpacing: 0.5,
    ...GLOW,
  },
  dim: { color: AMBER2, opacity: 0.65, textShadowRadius: 3 },
  blank: { height: 10 },
  cursor: { color: 'transparent', fontSize: 13 },
  cursorOn: { color: AMBER },
  granted: {
    fontFamily: 'Courier New, Courier, monospace',
    fontSize: 14, lineHeight: 24, fontWeight: '700',
    color: '#FFFFFF', letterSpacing: 1,
    textShadowColor: '#FFFFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },

  // ── Awaiting Command ─────────────────────────────────────────────────────
  awaitingWrap: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 4,
  },
  awaitingText: {
    fontFamily: 'Courier New, Courier, monospace',
    fontSize: 15, fontWeight: '700', letterSpacing: 0.8,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  awaitingHint: {
    fontFamily: 'Courier New, Courier, monospace',
    fontSize: 10, letterSpacing: 1.5,
    color: 'rgba(200,150,12,0.5)',
  },
});
