import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

export interface PlaybackSheetSource {
  addon?: string;
  server?: string;
  quality?: string;
  language?: string;
  subtitle?: string;
}

interface Props {
  visible: boolean;
  addons: string[];
  servers: string[];
  qualities: string[];
  languages: string[];
  subtitles: string[];
  selectedAddon: string | null;
  selectedServer: string | null;
  selectedQuality: string | null;
  selectedLanguage: string | null;
  selectedSubtitle: string | null;
  onSelectAddon: (value: string) => void;
  onSelectServer: (value: string) => void;
  onSelectQuality: (value: string) => void;
  onSelectLanguage: (value: string) => void;
  onSelectSubtitle: (value: string) => void;
  onClose: () => void;
  onPlay: () => void;
}

function OptionGroup({
  title,
  values,
  selectedValue,
  onSelect,
}: {
  title: string;
  values: string[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
}) {
  if (values.length === 0) return null;
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.optionWrap}>
        {values.map((value) => (
          <Pressable key={value} style={[styles.optionChip, selectedValue === value && styles.optionChipActive]} onPress={() => onSelect(value)}>
            <Text style={[styles.optionChipText, selectedValue === value && styles.optionChipTextActive]}>{value}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function PlaybackSourceSheet(props: Props) {
  const {
    visible,
    addons,
    servers,
    qualities,
    languages,
    subtitles,
    selectedAddon,
    selectedServer,
    selectedQuality,
    selectedLanguage,
    selectedSubtitle,
    onSelectAddon,
    onSelectServer,
    onSelectQuality,
    onSelectLanguage,
    onSelectSubtitle,
    onClose,
    onPlay,
  } = props;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalScrim}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Choose Playback Source</Text>
          <Text style={styles.modalHint}>Select the add-on, server, quality, and language you want to use.</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            <OptionGroup title="Add-on" values={addons} selectedValue={selectedAddon} onSelect={onSelectAddon} />
            <OptionGroup title="Server" values={servers} selectedValue={selectedServer} onSelect={onSelectServer} />
            <OptionGroup title="Quality" values={qualities} selectedValue={selectedQuality} onSelect={onSelectQuality} />
            <OptionGroup title="Language" values={languages} selectedValue={selectedLanguage} onSelect={onSelectLanguage} />
            <OptionGroup title="Subtitle" values={subtitles} selectedValue={selectedSubtitle} onSelect={onSelectSubtitle} />
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.modalSecondaryBtn} onPress={onClose}>
              <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.modalPrimaryBtn} onPress={onPlay}>
              <Text style={styles.modalPrimaryBtnText}>Play</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 560, borderRadius: 18, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 20, gap: 14 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  modalHint: { fontSize: 13, color: theme.textSecondary, lineHeight: 20 },
  group: { marginBottom: 14 },
  groupTitle: { fontSize: 12, fontWeight: '700', color: theme.textMuted, letterSpacing: 0.7, marginBottom: 8 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border },
  optionChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  optionChipText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  optionChipTextActive: { color: '#FFF' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalSecondaryBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  modalSecondaryBtnText: { fontSize: 14, fontWeight: '700', color: theme.textSecondary },
  modalPrimaryBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  modalPrimaryBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
});
