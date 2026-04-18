import { Image } from 'expo-image';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useServer } from '@/context/ServerContext';
import { useNetworkScan, ScanResult } from '@/hooks/useNetworkScan';
import { posthog } from '@/lib/posthog';

export function ServerSetup() {
  const { setServerUrl } = useServer();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { scanning, results, error: scanError, scan } = useNetworkScan();

  const handleConnect = async (connectUrl?: string) => {
    const trimmed = (connectUrl ?? url).trim().replace(/\/$/, '');
    if (!trimmed.startsWith('http')) {
      Alert.alert('Invalid URL', 'Server URL must start with http:// or https://');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${trimmed}/api/speakers`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      posthog.capture('server_connected', { method: connectUrl ? 'scan' : 'manual' });
      await setServerUrl(trimmed);
    } catch (e) {
      Alert.alert('Connection Failed', String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = (result: ScanResult) => {
    setUrl(result.url);
    handleConnect(result.url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo area */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/splash-icon.svg')}
              style={styles.logoImage}
              contentFit="contain"
            />
            <Text style={styles.logoTitle}>Kyuu</Text>
            <Text style={styles.logoSubtitle}>A local-first controller for your Sonos speakers</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connect to your server</Text>
            <Text style={styles.cardSubtitle}>
              Scan your network to find the server automatically, or enter the address manually.
            </Text>

            {/* Scan button */}
            <TouchableOpacity
              style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
              onPress={scan}
              disabled={scanning}
              activeOpacity={0.8}
            >
              {scanning ? (
                <View style={styles.scanButtonInner}>
                  <ActivityIndicator color="#FFD32C" size="small" />
                  <Text style={styles.scanButtonText}>Scanning network...</Text>
                </View>
              ) : (
                <Text style={styles.scanButtonText}>Scan Network</Text>
              )}
            </TouchableOpacity>

            {/* Scan results */}
            {results.length > 0 && (
              <View style={styles.results}>
                {results.map((r) => (
                  <TouchableOpacity
                    key={r.url}
                    style={styles.resultRow}
                    onPress={() => handleSelectResult(r)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.resultDot} />
                    <View style={styles.resultMeta}>
                      <Text style={styles.resultName}>{r.name}</Text>
                      <Text style={styles.resultUrl}>{r.url}</Text>
                    </View>
                    <Text style={styles.resultChevron}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {scanError ? (
              <Text style={styles.scanError}>{scanError}</Text>
            ) : null}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or enter manually</Text>
              <View style={styles.dividerLine} />
            </View>

            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="http://192.168.1.100:3001"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={() => handleConnect()}
            />

            <TouchableOpacity
              style={[styles.button, (loading || !url.trim()) && styles.buttonDisabled]}
              onPress={() => handleConnect()}
              disabled={loading || !url.trim()}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#0a0a0a" size="small" />
              ) : (
                <Text style={styles.buttonText}>Connect</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            Make sure your phone and server are on the same Wi-Fi network
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  inner: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 22,
  },
  logoTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  logoSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 20,
  },
  scanButton: {
    backgroundColor: 'rgba(255,211,44,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,211,44,0.3)',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFD32C',
  },
  results: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  resultDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    flexShrink: 0,
  },
  resultMeta: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  resultUrl: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  resultChevron: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.3)',
    lineHeight: 24,
  },
  scanError: {
    fontSize: 13,
    color: 'rgba(255,100,80,0.8)',
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#ffffff',
  },
  button: {
    backgroundColor: '#FFD32C',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0a',
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});
