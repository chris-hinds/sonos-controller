import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { usePlayer } from '@/context/PlayerContext';
import { SpeakerInfo } from '@/types/sonos';

type Filter = 'rooms' | 'speakers';

interface Group {
  coordinator: SpeakerInfo;
  members: SpeakerInfo[];
}

export default function RoomsScreen() {
  const { speakers, groupState: activeGroupState, selectedIp } = usePlayer();
  const [filter, setFilter] = useState<Filter>('rooms');

  const groups = useMemo<Group[]>(() => {
    const coordinators = speakers.filter((s) => s.isCoordinator);
    return coordinators.map((coordinator) => ({
      coordinator,
      members: speakers.filter((s) => !s.isCoordinator && s.coordinatorIp === coordinator.ip),
    }));
  }, [speakers]);

  const isGroupActive = (group: Group) => {
    const selectedSpeaker = speakers.find((s) => s.ip === selectedIp);
    const activeCoordIp = selectedSpeaker?.coordinatorIp || selectedSpeaker?.ip;
    return activeCoordIp === group.coordinator.ip;
  };

  if (speakers.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📡</Text>
        <Text style={styles.emptyTitle}>No speakers found</Text>
        <Text style={styles.emptySubtitle}>
          Make sure your Kyuu server is running and on the same network
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        <View style={styles.filterPills}>
          {(['rooms', 'speakers'] as Filter[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.pill, filter === f && styles.pillActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
                {f === 'rooms' ? `Rooms (${groups.length})` : `Speakers (${speakers.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.countBadges}>
          <View style={styles.countBadge}>
            <SymbolView name="music.note.house" size={14} tintColor="rgba(255,255,255,0.7)" />
            <Text style={styles.countText}>{groups.length}</Text>
          </View>
          <View style={styles.countBadge}>
            <SymbolView name="hifispeaker.2" size={14} tintColor="rgba(255,255,255,0.7)" />
            <Text style={styles.countText}>{speakers.length}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {filter === 'rooms' ? (
          groups.map((group) => {
            const active = isGroupActive(group);
            const isPlaying = active && activeGroupState?.transportState === 'PLAYING';
            const track = active ? activeGroupState?.track : null;

            return (
              <View key={group.coordinator.ip} style={[styles.card, active && styles.cardActive]}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.cardName, active && styles.cardNameActive]}>
                      {group.coordinator.name}
                    </Text>
                    {active && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>}
                  </View>
                  <Text style={styles.cardMeta}>
                    {group.coordinator.model} · {group.coordinator.ip}
                    {group.members.length > 0 ? ` · +${group.members.length} speaker${group.members.length !== 1 ? 's' : ''}` : ''}
                  </Text>
                </View>

                <View style={styles.statusRow}>
                  <View style={[styles.dot, isPlaying && styles.dotActive]} />
                  {track?.title ? (
                    <Text style={styles.trackText} numberOfLines={1}>
                      {track.title}{track.artist ? ` · ${track.artist}` : ''}
                    </Text>
                  ) : (
                    <Text style={styles.idleText}>Idle</Text>
                  )}
                </View>

                {/* Volume bars */}
                {[group.coordinator, ...group.members].map((speaker) => {
                  const vol = activeGroupState?.volume?.[speaker.ip];
                  const level = vol?.mute ? 0 : (vol?.volume ?? 0);
                  return (
                    <View key={speaker.ip} style={styles.volRow}>
                      <Text style={styles.volLabel} numberOfLines={1}>{speaker.name}</Text>
                      <View style={styles.volTrack}>
                        <View style={[styles.volFill, { width: `${level}%` as any }]} />
                      </View>
                      <Text style={styles.volValue}>{vol?.mute ? 'M' : (vol?.volume ?? '–')}</Text>
                    </View>
                  );
                })}

                {/* Grouped members */}
                {group.members.length > 0 && (
                  <View style={styles.memberList}>
                    {group.members.map((m) => (
                      <View key={m.ip} style={styles.memberRow}>
                        <Text style={styles.memberBullet}>›</Text>
                        <Text style={styles.memberName}>{m.name}</Text>
                        <Text style={styles.memberMeta}>{m.model} · {m.ip}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        ) : (
          speakers.map((speaker) => {
            const isSelected = speaker.ip === selectedIp;
            const vol = activeGroupState?.volume?.[speaker.ip];
            return (
              <View key={speaker.ip} style={[styles.card, isSelected && styles.cardActive]}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.cardName, isSelected && styles.cardNameActive]}>
                      {speaker.name}
                    </Text>
                    {speaker.isCoordinator && <View style={styles.coordBadge}><Text style={styles.coordBadgeText}>Coordinator</Text></View>}
                    {isSelected && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>}
                  </View>
                  <Text style={styles.cardMeta}>{speaker.model} · {speaker.ip}</Text>
                </View>
                {speaker.coordinatorIp && speaker.coordinatorIp !== speaker.ip && (
                  <Text style={styles.groupedUnder}>
                    Grouped under {speakers.find((s) => s.ip === speaker.coordinatorIp)?.name ?? speaker.coordinatorIp}
                  </Text>
                )}
                {vol !== undefined && (
                  <View style={styles.volRow}>
                    <Text style={styles.volLabel}>Volume</Text>
                    <View style={styles.volTrack}>
                      <View style={[styles.volFill, { width: `${vol.mute ? 0 : vol.volume}%` as any }]} />
                    </View>
                    <Text style={styles.volValue}>{vol.mute ? 'M' : vol.volume}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  filterPills: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  countBadges: {
    flexDirection: 'row',
    gap: 10,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    fontVariant: ['tabular-nums'],
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pillActive: {
    backgroundColor: 'rgba(255,211,44,0.15)',
    borderColor: 'rgba(255,211,44,0.4)',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  pillTextActive: {
    color: '#FFD32C',
  },
  list: {
    padding: 16,
    gap: 10,
    paddingBottom: 48,
  },
  card: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 10,
  },
  cardActive: {
    borderColor: 'rgba(255,211,44,0.3)',
    backgroundColor: '#161510',
  },
  cardHeader: { gap: 3 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  cardNameActive: { color: '#ffffff' },
  cardMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'Menlo',
  },
  activeBadge: {
    backgroundColor: 'rgba(255,211,44,0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFD32C',
  },
  coordBadge: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coordBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dotActive: { backgroundColor: '#FFD32C' },
  trackText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },
  idleText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.2)',
  },
  groupedUnder: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
  },
  volRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  volLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    width: 88,
  },
  volTrack: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  volFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  volValue: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    width: 20,
    textAlign: 'right',
  },
  memberList: {
    gap: 5,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberBullet: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.2)',
  },
  memberName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    flex: 1,
  },
  memberMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    fontFamily: 'Menlo',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
    backgroundColor: '#0a0a0a',
  },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
