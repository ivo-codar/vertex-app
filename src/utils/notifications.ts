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

// ── Routine Notifications ─────────────────────────────────────────────────────

interface RoutineInfo {
  id: string;
  title: string;
  time: string;    // "HH:MM"
  days: number[];  // 0=Mo … 6=So, empty = every day
}

// expo-notifications weekday: 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat
function toExpoWeekday(ourDay: number): number {
  // ourDay: 0=Mo … 6=So
  return ourDay === 6 ? 1 : ourDay + 2;
}

function parseTime(timeStr: string): { hour: number; minute: number } | null {
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const hour   = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Schedules recurring daily (or per-day-of-week) reminders for a routine.
 * Returns the list of scheduled notification IDs.
 */
export async function scheduleRoutineReminders(routine: RoutineInfo): Promise<string[]> {
  if (isWeb) return [];
  const parsed = parseTime(routine.time);
  if (!parsed) return [];

  try {
    const Notifications = await import('expo-notifications');
    const { hour, minute } = parsed;
    const ids: string[] = [];

    // days === [] means every day → use DAILY trigger
    if (routine.days.length === 0) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰  ${routine.title}`,
          body:  'Deine tägliche Routine wartet auf dich.',
          data:  { routineId: routine.id },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
      ids.push(id);
    } else {
      // Schedule one notification per selected weekday
      for (const day of routine.days) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `⏰  ${routine.title}`,
            body:  'Deine Routine wartet auf dich.',
            data:  { routineId: routine.id },
            sound: true,
          },
          trigger: {
            type:    Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: toExpoWeekday(day),
            hour,
            minute,
          },
        });
        ids.push(id);
      }
    }

    return ids;
  } catch {
    return [];
  }
}

/** Cancels all scheduled notifications for a routine. */
export async function cancelRoutineReminders(notifIds: string[]): Promise<void> {
  if (isWeb || !notifIds?.length) return;
  try {
    const Notifications = await import('expo-notifications');
    await Promise.all(notifIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));
  } catch {
    // ignore
  }
}
