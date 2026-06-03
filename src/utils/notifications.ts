import { Platform } from 'react-native';

// expo-notifications has no web support — guard everything
const isWeb = Platform.OS === 'web';

// Only configure on native
if (!isWeb) {
  // Dynamic import to avoid loading native module on web
  (async () => {
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  })();
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (isWeb) return false;
  try {
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

interface EventInfo {
  id: string;
  title: string;
  isoDate: string;
  tag: string;
}

const TAG_EMOJI: Record<string, string> = {
  Klausur:    '📚',
  Schule:     '🎓',
  Gym:        '💪',
  Arbeit:     '💼',
  Freunde:    '👥',
  Gesundheit: '🩺',
  Persönlich: '⭐',
};

export async function scheduleEventReminder(event: EventInfo): Promise<string | null> {
  if (isWeb) return null;
  try {
    const Notifications = await import('expo-notifications');
    const eventDate  = new Date(event.isoDate + 'T09:00:00');
    const reminderAt = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
    if (reminderAt <= new Date()) return null;

    const emoji    = TAG_EMOJI[event.tag] ?? '📅';
    const dayLabel = eventDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `${emoji}  Morgen: ${event.title}`,
        body:  `Dein ${event.tag}-Termin ist morgen (${dayLabel}). Sei vorbereitet!`,
        data:  { eventId: event.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderAt,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelEventReminder(notifId: string): Promise<void> {
  if (isWeb) return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(notifId);
  } catch {
    // ignore
  }
}
