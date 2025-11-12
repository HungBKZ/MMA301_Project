import React, { useCallback, useRef, useState } from 'react';
import { View, Modal, ActivityIndicator, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * VnpayWebView
 * Props:
 *  - payUrl: string (sandbox payment URL)
 *  - onResult: (result) => void  // { success, code, txnRef, orderId }
 *  - onCancel: () => void
 */
export default function VnpayWebView({ visible, payUrl, onResult, onCancel }) {
  const [loading, setLoading] = useState(true);
  const handledRef = useRef(false);

  const handleMessage = useCallback((event) => {
    if (handledRef.current) return; // prevent double
    try {
      const data = JSON.parse(event.nativeEvent.data);
      handledRef.current = true;
      onResult?.({
        success: data.success === 1,
        code: data.code,
        txnRef: data.txnRef,
        orderId: data.orderId,
      });
    } catch (e) {
      // ignore
    }
  }, [onResult]);

  const handleNavChange = useCallback((navState) => {
    if (handledRef.current) return;
    const url = navState?.url || '';

    // Robust fallback: parse VNPay params from URL even if the return endpoint is offline
    // VNPay appends vnp_ResponseCode, vnp_TxnRef, ... to the return URL
    const hasVnpParams = /[?&]vnp_ResponseCode=/.test(url) || /[?&]vnp_TxnRef=/.test(url);
    if (hasVnpParams) {
      try {
        const qStr = url.split('?')[1] || '';
        const params = {};
        qStr.split('&').forEach(p => {
          const [k, v] = p.split('=');
          if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
        });
        const code = params['vnp_ResponseCode'] || '';
        const txnRef = params['vnp_TxnRef'] || '';
        const orderId = typeof txnRef === 'string' ? txnRef.split('-')[0] : '';
        handledRef.current = true;
        onResult?.({ success: code === '00', code, txnRef, orderId });
        return;
      } catch (e) {
        // fallthrough to other strategies
      }
    }

    // If we reached our WebView bridge page but no postMessage yet, set a short timeout
    if (url.includes('/payment/vnpay/return-webview')) {
      setTimeout(() => {
        if (!handledRef.current) {
          handledRef.current = true;
          onResult?.({ success: false, code: 'NO_POSTMESSAGE', txnRef: '', orderId: '' });
        }
      }, 1500);
    }
  }, [onResult]);

  const closeIfUnhandled = () => {
    if (!handledRef.current) {
      Alert.alert('Đã hủy', 'Bạn đã đóng trang thanh toán.');
      onCancel?.();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={closeIfUnhandled}>
      <View style={styles.header}>
        <Text style={styles.title}>Thanh toán VNPay</Text>
        <TouchableOpacity onPress={closeIfUnhandled} style={styles.closeBtn}>
          <Text style={styles.closeText}>Đóng</Text>
        </TouchableOpacity>
      </View>
      {!payUrl ? (
        <View style={styles.center}><Text>Không có URL thanh toán</Text></View>
      ) : (
        <WebView
          source={{ uri: payUrl }}
          onLoadEnd={() => setLoading(false)}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavChange}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.center}><ActivityIndicator size="large" /></View>
          )}
        />
      )}
      {loading && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#fff" /></View>}
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#1e1e1e' },
  title: { color: '#fff', fontSize: 16, fontWeight: '600' },
  closeBtn: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#333', borderRadius: 4 },
  closeText: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0006', alignItems: 'center', justifyContent: 'center' }
});
