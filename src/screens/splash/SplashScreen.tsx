import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// ── Boot sequence definition ──────────────────────────────────────────────────

const SEQ = [
  { text: 'SYSTEM UPLINK ESTABLISHED...',                              speed: 48, pause: 700  },
  { text: '',                                                           speed: 0,  pause: 100  },
  { text: 'INITIALIZING  V.E.R.T.E.X.',                               speed: 55, pause: 350  },
  { text: '[Virtual Environment for Routine & Tactical Execution X]',  speed: 22, pause: 700, dim: true },
  { text: '',                                                           speed: 0,  pause: 200  },
  { text: 'SYNCING PERFORMANCE METRICS...',                            speed: 42, pause: 300  },
  { text: 'O.R.A.C.L.E. COACHING PROTOCOL: ONLINE',                   speed: 42, pause: 900  },
  { text: '',                                                           speed: 0,  pause: 150  },
  { text: 'AWAITING COMMAND.',                                         speed: 90, pause: 1400, hi: true },
];

const AMBER  = '#E09B00';
const AMBER2 = '#C8960C';
const BG     = '#06060C';

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onFinish: () => void; }

type Line = { text: string; dim?: boolean; hi?: boolean };

export default function SplashScreen({ onFinish }: Props) {
  const [done, setDone]               = useState<Line[]>([]);
  const [typing, setTyping]           = useState('');
  const [cursorOn, setCursorOn]       = useState(true);
  const [showCursor, setShowCursor]   = useState(true);
  const fadeAnim                      = useRef(new Animated.Value(1)).current;
  const ran                           = useRef(false);

  // Cursor blink
  useEffect(() => {
    const id = setInterval(() => setCursorOn(v => !v), 530);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      for (const step of SEQ) {
        if (step.text === '') {
          setDone(p => [...p, { text: '' }]);
          await wait(step.pause);
          continue;
        }
        setShowCursor(true);
        for (let i = 0; i <= step.text.length; i++) {
          setTyping(step.text.slice(0, i));
          await wait(step.speed);
        }
        setShowCursor(false);
        setDone(p => [...p, { text: step.text, dim: step.dim, hi: step.hi }]);
        setTyping('');
        await wait(step.pause);
      }

      // Fade out → enter app
      await wait(200);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: false,
      }).start(() => onFinish());
    })();
  }, []); // eslint-disable-line

  return (
    <Animated.View style={[s.root, { opacity: fadeAnim }]}>
      <StatusBar style="light" backgroundColor={BG} />
      <View style={s.terminal}>
        {done.map((line, i) =>
          line.text === '' ? (
            <View key={i} style={s.blankLine} />
          ) : (
            <Text key={i} style={[
              s.line,
              line.dim  && s.lineDim,
              line.hi   && s.lineHi,
            ]}>
              {'> '}{line.text}
            </Text>
          )
        )}

        {/* Currently typing line */}
        {typing !== '' && (
          <Text style={s.line}>
            {'> '}{typing}
            {showCursor && <Text style={[s.cursor, cursorOn && s.cursorOn]}>█</Text>}
          </Text>
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
  terminal: {
    gap: 1,
  },
  line: {
    fontFamily: 'Courier New, Courier, monospace',
    fontSize: 13,
    lineHeight: 22,
    color: AMBER,
    letterSpacing: 0.5,
    ...GLOW,
  },
  lineDim: {
    color: AMBER2,
    opacity: 0.65,
    textShadowRadius: 3,
  },
  lineHi: {
    color: '#FFFFFF',
    textShadowColor: '#FFFFFF',
    textShadowRadius: 10,
    fontWeight: '700',
  },
  blankLine: {
    height: 10,
  },
  cursor: {
    color: 'transparent',
    fontSize: 13,
  },
  cursorOn: {
    color: AMBER,
  },
});
