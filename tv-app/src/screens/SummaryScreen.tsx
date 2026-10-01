import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {CoachSummary} from '../coach';
import {ExerciseDef} from '../exercises';
import {FocusButton} from '../FocusButton';
import {color, font} from '../theme';
import {StatTile} from './shared';

export type SummaryStats = {reps: number; paceMs: number | null; bestDepth: number | null; clean: number};

export const SummaryScreen = ({
  exercise,
  stats,
  summary,
  aiCoached,
  onAgain,
  onNew,
}: {
  exercise: ExerciseDef;
  stats: SummaryStats;
  summary: CoachSummary;
  aiCoached: boolean;
  onAgain: () => void;
  onNew: () => void;
}) => (
  <View style={styles.root}>
    <View style={styles.left}>
      <View>
        <Text style={styles.complete}>SESSION COMPLETE</Text>
        <Text style={styles.count}>{stats.reps}</Text>
        <Text style={styles.unit}>{exercise.unit.toUpperCase()}</Text>
      </View>
      <View style={styles.tiles}>
        <StatTile grow label="PACE" value={stats.paceMs == null ? '—' : `${(stats.paceMs / 1000).toFixed(1)} s`} />
        <View style={styles.gap} />
        <StatTile grow label="BEST DEPTH" value={stats.bestDepth == null ? '—' : `${stats.bestDepth}°`} />
        <View style={styles.gap} />
        <StatTile grow label="CLEAN REPS" value={`${stats.clean} / ${stats.reps}`} />
      </View>
      <View style={styles.buttons}>
        <FocusButton label="Same again" onPress={onAgain} preferred testID="again" />
        <View style={styles.gap} />
        <FocusButton label="New workout" onPress={onNew} testID="new-workout" />
      </View>
    </View>

    <View style={styles.right}>
      <View style={styles.coachCard}>
        <View style={styles.coachHeader}>
          <View style={styles.coachMark} />
          <Text style={styles.coachLabel}>COACH</Text>
          {aiCoached ? (
            <Text style={styles.aiLabel} testID="ai-label">
              ✨ AI coach
            </Text>
          ) : null}
        </View>
        <Text style={styles.headline} testID="summary-headline">
          {summary.headline}
        </Text>
        {summary.insights.map((line) => (
          <Text key={line} style={styles.insight}>
            {line}
          </Text>
        ))}
      </View>
      <View style={styles.next}>
        <Text style={styles.nextLabel}>NEXT TIME</Text>
        <Text style={styles.nextText}>{summary.next.replace(/^next time[:,]?\s*/i, '')}</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: {flex: 1, flexDirection: 'row', backgroundColor: color.ground, paddingHorizontal: 72, paddingVertical: 52},
  left: {flex: 1, justifyContent: 'space-between', marginRight: 56},
  right: {flex: 1, justifyContent: 'center'},
  complete: {color: color.accent, fontFamily: font.bodyBold, fontSize: 20, letterSpacing: 3},
  count: {color: color.text, fontFamily: font.display, fontSize: 160, lineHeight: 150},
  unit: {color: color.text, fontFamily: font.display, fontSize: 52},
  tiles: {flexDirection: 'row'},
  buttons: {flexDirection: 'row'},
  gap: {width: 16, height: 16},
  coachCard: {
    padding: 34,
    borderRadius: 28,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
  },
  coachHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 20},
  coachMark: {width: 36, height: 36, borderRadius: 10, backgroundColor: color.accent, marginRight: 12},
  coachLabel: {color: color.text, fontFamily: font.bodyBold, fontSize: 18, letterSpacing: 2, flex: 1},
  aiLabel: {color: color.accent, fontFamily: font.bodyMedium, fontSize: 18},
  headline: {color: color.text, fontFamily: font.displayBold, fontSize: 40, lineHeight: 44, marginBottom: 14},
  insight: {color: color.textSecondary, fontFamily: font.body, fontSize: 22, lineHeight: 31, marginTop: 8},
  next: {
    marginTop: 22,
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderRadius: 22,
    backgroundColor: color.cueSurface,
    borderWidth: 2,
    borderColor: color.cue,
  },
  nextLabel: {color: color.cue, fontFamily: font.bodyBold, fontSize: 16, letterSpacing: 2},
  nextText: {color: color.text, fontFamily: font.displayBold, fontSize: 30, marginTop: 6},
});
