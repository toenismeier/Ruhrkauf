import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import type { ComponentType, Ref } from 'react';
import { WebView as WebViewRoh } from 'react-native-webview';
import type { IOSWebViewProps } from 'react-native-webview/lib/WebViewTypes';

// Die gebündelten Typen der WebView kollidieren mit React Native 0.88 (Props werden zu never); wir nutzen nur iOS.
type WebViewHandle = { reload: () => void };
const WebView = WebViewRoh as unknown as ComponentType<IOSWebViewProps & { ref?: Ref<WebViewHandle> }>;

// Fester Ursprung, damit IndexedDB (Spielstände) dauerhaft demselben Origin gehört.
const URSPRUNG = 'https://spiel.hartwig.app/';

export default function App() {
  useKeepAwake();
  const webRef = useRef<WebViewHandle>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [geladen, setGeladen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const asset = Asset.fromModule(require('./spiel/spiel.html'));
        await asset.downloadAsync();
        if (!asset.localUri) throw new Error('Spieldatei fehlt');
        setHtml(await new File(asset.localUri).text());
      } catch (e) {
        setFehler(String(e));
      }
    })();
  }, []);

  return (
    <View style={styles.grund}>
      <StatusBar hidden />
      {html && (
        <WebView
          ref={webRef}
          style={styles.grund}
          originWhitelist={['*']}
          source={{ html, baseUrl: URSPRUNG }}
          javaScriptEnabled
          scrollEnabled={false}
          bounces={false}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          allowsBackForwardNavigationGestures={false}
          allowsLinkPreview={false}
          textInteractionEnabled={false}
          webviewDebuggingEnabled
          onLoadEnd={() => setGeladen(true)}
          onContentProcessDidTerminate={() => webRef.current?.reload()}
          onError={(e: { nativeEvent: { description: string } }) => setFehler(e.nativeEvent.description)}
        />
      )}
      {!geladen && (
        <View style={styles.lade} pointerEvents="none">
          <Text style={styles.marke}>HARTWIG</Text>
          {fehler ? <Text style={styles.fehler}>{fehler}</Text> : <ActivityIndicator color="#ffffff" />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grund: { flex: 1, backgroundColor: '#4fb6c2' },
  lade: { ...StyleSheet.absoluteFill, backgroundColor: '#d23c32', alignItems: 'center', justifyContent: 'center', gap: 24 },
  marke: { color: '#ffffff', fontSize: 34, fontWeight: '800', letterSpacing: 4 },
  fehler: { color: '#ffffff', fontSize: 14, paddingHorizontal: 24, textAlign: 'center' },
});
