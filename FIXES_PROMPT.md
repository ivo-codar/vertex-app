# Vertex App — Fix List

Bitte folgende Probleme in der Reihenfolge beheben:

---

## 1. DeepWork Weekly Chart aktualisiert sich nicht (BUG)

**Datei:** `src/screens/deepwork/DeepWorkScreen.tsx`  
**Zeile ~198** (manuelle Session-Eingabe):

```ts
setSessions(prev => [{ id: `m-${Date.now()}`, subject: sub, duration: mins }, ...prev]);
setWeekData(prev => prev.map((v, i) => i === todayIdx ? v + mins : v)); // ← FALSCH: setWeekData existiert nicht
```

`setWeekData` und `todayIdx` existieren nicht. Der korrekte Aufruf lautet:

```ts
setSessions(prev => [{ id: `m-${Date.now()}`, subject: sub, duration: mins, date: new Date().toISOString().split('T')[0] }, ...prev]);
addToWeek('focusWeek', todayDow(), mins); // ← so wie beim Timer-Stop auf Zeile 159
```

Außerdem: Beim Timer-Stop (Zeile 158) wird das neue `date`-Feld in WorkSession ebenfalls befüllen:

```ts
setSessions(prev => [{ id: Date.now().toString(), subject: subjectName, duration: mins, date: new Date().toISOString().split('T')[0] }, ...prev]);
```

---

## 2. Alignment Meter — Beschriftungen redesignen (TONY STARK / BATMAN AESTHETIC)

**Datei:** `src/screens/progress/ProgressScreen.tsx`

Das "SYSTEM QUERY" Panel (~Zeile 200–230) wirkt wie ein Schulprojekt. Bitte anpassen:

**Aktuell:**
- Überschrift: `SYSTEM QUERY`
- Frage: `WERE TOXINS CONSUMED TODAY?`
- Note unten: generischer Text

**Soll — JARVIS/Oracle Style:**
- Überschrift: `PROTOCOL CHECK` (kleiner, uppercase, Accent-Farbe, Letter-Spacing wie die anderen Labels)
- Frage: `COMPROMISING AGENTS DETECTED?` oder `SYSTEM INTEGRITY SCAN`
- Die drei Toxin-Einträge (`Junkfood`, `Doom-Scrolling`, `Snooze`) bleiben, aber ihren Style überarbeiten:
  - Inaktiv: dezenter Card-Look, kein roter Rahmen
  - Aktiv (checked): roter Left-Accent-Stripe (3px) + gedämpfter Hintergrund, kein greller Rahmen
- Note unten: `FLAGGED AGENTS REDUCE ALIGNMENT SCORE` (nicht als Warnung, als technisches Monitoring-Statement)
- Das Morning-Check-Modal (`pendingMorningCheck`, ~Zeile 401): 
  - Titel: `MORNING DIAGNOSTIC`
  - Untertitel: `REPORT COMPROMISING BEHAVIOR FROM LAST CYCLE`
  - Bestätigen-Button: `SUBMIT REPORT` statt OK/Bestätigen

---

## 3. Alignment Score — Gym & Focus Aktivität besser widerspiegeln

**Datei:** `src/store/index.ts`, `src/screens/progress/ProgressScreen.tsx`

Das Alignment zeigt aktuell nur Toxin-Penalties (−1 pro Toxin) und Session-Bonuses (+1 Gym, +1 Focus). Das System fühlt sich statisch an.

Verbesserungen:

**A) Im Progress Screen:** Unterhalb des Alignment-Meters eine Zeile `SIGNAL SOURCES` anzeigen, die heute aktive Beiträge listet:
- `⚡ +1 Focus Session` falls heute gelernt wurde (prüfen: `focusSessions` enthält Session mit `date === today`)
- `💪 +1 Gym Session` falls heute trainiert wurde (prüfen: `gymRecords` haben Entry mit `date === today`)
- `🔴 −X Toxins` falls Toxine aktiv

**B)** Der Score-Bereich soll nicht als zahl "+3" angezeigt werden, sondern als Balken + Status-Label (das ist bereits so), aber zusätzlich soll darunter stehen: `TODAY'S DELTA: +3` in der Accent-Farbe.

---

## 4. Projekt-Screen — Karten-Aktionen: Touch-Targets zu klein (UX FIX)

**Datei:** `src/screens/projects/ProjectsScreen.tsx`  
**Komponente:** `KanbanCardView` (~Zeile 348ff)

Das Problem: Die Pfeile (links/rechts bewegen), Edit und Delete sind alle in `cs.arrows` nebeneinander gequetscht mit winzigen Touch-Areas.

**Lösung — neue Karten-Interaktionen:**

1. **Hauptkarte antippen** → öffnet Edit-Modal (statt dem separaten Pencil-Button)
2. **Lange halten** auf Karte → zeigt Action-Sheet mit:
   - `← Nach links` (nur wenn nicht erste Spalte)
   - `→ Nach rechts` (nur wenn nicht letzte Spalte)
   - `Bearbeiten`
   - `Löschen` (rot)
3. Den alten `cs.arrows`-Container (mit 4 gequetschten Icons) komplett entfernen.

Technisch: `onLongPress` auf `TouchableOpacity` der Karte, Action-Sheet als `Modal` mit `animationType="fade"`, transparent overlay. Style: bottom sheet oder zentriertes Modal im Vertex-Theme (dark surface, gold accent).

Die `moveCard`-Funktion in `ProjectsScreen` existiert und funktioniert bereits — sie muss nur anders ausgelöst werden.

**Wichtig:** Das Action-Sheet soll auch die Column-Navigation anzeigen, also wenn die Karte z.B. in "In Progress" ist:
- `← To Do`
- `→ Done`
als beschriftete Buttons (nicht nur Pfeil-Icons).

---

## 5. Zusammenfassung der betroffenen Dateien

| Datei | Was ändern |
|---|---|
| `src/screens/deepwork/DeepWorkScreen.tsx` | `setWeekData` Bug fixen, `date`-Feld in Sessions |
| `src/screens/progress/ProgressScreen.tsx` | Texte redesignen (JARVIS-Style), Signal Sources anzeigen |
| `src/screens/projects/ProjectsScreen.tsx` | Long-press Action-Sheet, Tap = Edit |

Bitte in dieser Reihenfolge vorgehen. Nach jeder Datei kurz bestätigen was geändert wurde.
