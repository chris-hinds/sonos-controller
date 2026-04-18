import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useServer } from '@/context/ServerContext';
import { usePlayer } from '@/context/PlayerContext';
import { useNetworkScan } from '@/hooks/useNetworkScan';
import { useAnalytics } from '@/hooks/useAnalytics';

const SPEAKERS_CACHE_KEY = '@sonos/speakers';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { serverUrl, setServerUrl, clearServerUrl } = useServer();
  const { refreshSpeakers, speakers } = usePlayer();
  const [url, setUrl] = useState(serverUrl ?? '');
  const urlChanged = url.trim().replace(/\/$/, '') !== (serverUrl ?? '').replace(/\/$/, '');
  const [testing, setTesting] = useState(false);
  const { scanning, results: scanResults, error: scanError, scan } = useNetworkScan();
  const { capture } = useAnalytics();
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [hasSpeakerCache, setHasSpeakerCache] = useState(false);
  const [reloading, setReloading] = useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem(SPEAKERS_CACHE_KEY).then((raw) => setHasSpeakerCache(!!raw));
  }, []);

  const handleSave = async () => {
    const trimmed = url.trim().replace(/\/$/, '');
    if (!trimmed.startsWith('http')) {
      Alert.alert('Invalid URL', 'Server URL must start with http:// or https://');
      return;
    }
    await setServerUrl(trimmed);
    Alert.alert('Saved', 'Server URL updated successfully');
  };

  const handleTest = async () => {
    const trimmed = url.trim().replace(/\/$/, '');
    if (!trimmed.startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid URL first');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${trimmed}/api/speakers`, { signal: controller.signal }).finally(() => clearTimeout(timer));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 0;
      setTestResult('success');
      capture('Server Test Connection', { success: true });
      Alert.alert('Connected', `Found ${count} speaker${count !== 1 ? 's' : ''} on your network`);
    } catch {
      setTestResult('error');
      capture('Server Test Connection', { success: false });
      Alert.alert('Connection Failed', 'Could not reach the server. Check the URL and make sure the server is running.');
    } finally {
      setTesting(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Room Cache',
      'This will remove the cached speaker list. Rooms will reload from the network on next launch.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () =>
            AsyncStorage.removeItem(SPEAKERS_CACHE_KEY).then(() => {
              setHasSpeakerCache(false);
              Alert.alert('Cache Cleared', 'Room cache has been cleared.');
            }),
        },
      ]
    );
  };

  const handleForceReload = async () => {
    setReloading(true);
    try {
      await refreshSpeakers();
      Alert.alert('Rooms Reloaded', 'Speaker list has been refreshed from the server.');
    } catch {
      Alert.alert('Failed', 'Could not reload rooms. Check your server connection.');
    } finally {
      setReloading(false);
    }
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Server section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SERVER</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={(t) => {
                setUrl(t);
                setTestResult(null);
              }}
              placeholder="http://192.168.1.100:3001"
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
            />

            {/* Network scan */}
            <TouchableOpacity
              style={[styles.btn, styles.btnScan, scanning && styles.btnDisabled]}
              onPress={scan}
              disabled={scanning}
              activeOpacity={0.8}
            >
              {scanning ? (
                <View style={styles.scanRow}>
                  <ActivityIndicator color="#FFD32C" size="small" />
                  <Text style={styles.btnScanText}>Scanning...</Text>
                </View>
              ) : (
                <Text style={styles.btnScanText}>Scan Network</Text>
              )}
            </TouchableOpacity>

            {scanResults.length > 0 && (
              <View style={styles.scanResults}>
                {scanResults.map((r) => (
                  <TouchableOpacity
                    key={r.url}
                    style={styles.scanResultRow}
                    onPress={() => { setUrl(r.url); setTestResult(null); }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.scanResultDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scanResultName}>{r.name}</Text>
                      <Text style={styles.scanResultUrl}>{r.url}</Text>
                    </View>
                    <Text style={styles.navChevron}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {scanError ? (
              <Text style={styles.scanError}>{scanError}</Text>
            ) : null}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={handleTest}
                disabled={testing}
                activeOpacity={0.8}
              >
                {testing ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.btnSecondaryText}>
                    {testResult === 'success' ? '✓ Connected' : testResult === 'error' ? '✗ Failed' : 'Test Connection'}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, !urlChanged && styles.btnDisabled]}
                onPress={handleSave}
                disabled={!urlChanged}
                activeOpacity={0.8}
              >
                <Text style={styles.btnPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.separator} />

            <TouchableOpacity
              style={styles.disconnectRow}
              onPress={() =>
                Alert.alert(
                  'Disconnect Server',
                  'This will remove the saved server URL and return to the setup screen.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Disconnect',
                      style: 'destructive',
                      onPress: () => { capture('Server Disconnected'); clearServerUrl(); },
                    },
                  ]
                )
              }
              activeOpacity={0.7}
            >
              <Text style={styles.disconnectText}>Disconnect Server</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Rooms section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ROOMS</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.navRow} onPress={() => router.push('/rooms')} activeOpacity={0.7}>
              <View>
                <Text style={styles.infoLabel}>Speakers & Rooms</Text>
                <Text style={styles.navSubtitle}>{speakers.length} speaker{speakers.length !== 1 ? 's' : ''} discovered</Text>
              </View>
              <Text style={styles.navChevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.separator} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Room cache</Text>
              <Text style={styles.infoValue}>{hasSpeakerCache ? 'Cached' : 'Empty'}</Text>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary, !hasSpeakerCache && styles.btnDisabled]}
                onPress={handleClearCache}
                disabled={!hasSpeakerCache}
                activeOpacity={0.8}
              >
                <Text style={[styles.btnSecondaryText, !hasSpeakerCache && styles.btnDisabledText]}>
                  Clear Cache
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleForceReload}
                disabled={reloading}
                activeOpacity={0.8}
              >
                {reloading ? (
                  <ActivityIndicator color="#0a0a0a" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Reload Rooms</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* About section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App</Text>
              <Text style={styles.infoValue}>Kyuu</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>{appVersion}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Platform</Text>
              <Text style={styles.infoValue}>{Platform.OS}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  section: {
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#FFD32C',
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a0a0a',
  },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnDisabledText: {
    color: 'rgba(255,255,255,0.4)',
  },
  disconnectRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  disconnectText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ff3b30',
  },
  btnScan: {
    backgroundColor: 'rgba(255,211,44,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,211,44,0.25)',
  },
  btnScanText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFD32C',
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanResults: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  scanResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  scanResultDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    flexShrink: 0,
  },
  scanResultName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ffffff',
  },
  scanResultUrl: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  scanError: {
    fontSize: 12,
    color: 'rgba(255,100,80,0.8)',
    textAlign: 'center',
  },
  btnDanger: {
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
  },
  btnDangerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ff3b30',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  infoValue: {
    fontSize: 14,
    color: '#ffffff',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  navChevron: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.3)',
    lineHeight: 26,
  },
});
