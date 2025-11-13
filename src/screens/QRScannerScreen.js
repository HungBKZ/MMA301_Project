import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
} from 'react-native';
import { Linking } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import { getAllTickets } from '../database/ticketDB';
import { getAllBookings, getBookingById } from '../database/bookingDB';
import { getShowtimeById } from '../database/showtimeDB';
import { getRoomById } from '../database/roomDB';
import { getMovieById, getCinemaById } from '../database/db';

export default function QRScannerScreen({ navigation }) {
    const [hasPermission, setHasPermission] = useState(null);
    const [scanning, setScanning] = useState(true);
    const [ScannerComponent, setScannerComponent] = useState(null);
    const [manualValue, setManualValue] = useState('');

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const mod = await import('expo-barcode-scanner');
                if (!mounted) return;
                const { BarCodeScanner } = mod;
                setScannerComponent(() => BarCodeScanner);
                const perm = await (mod.requestPermissionsAsync ? mod.requestPermissionsAsync() : BarCodeScanner.requestPermissionsAsync());
                if (!mounted) return;
                setHasPermission((perm && perm.status) === 'granted');
            } catch (e) {
                console.warn('expo-barcode-scanner not available:', e?.message || e);
                if (!mounted) return;
                setScannerComponent(null);
                setHasPermission(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const buildTicketDetails = (ticket) => {
        try {
            if (!ticket) return null;
            const showtime = getShowtimeById(ticket.showtime_id);
            const movie = showtime ? getMovieById(showtime.movie_id) : null;
            const room = showtime ? getRoomById(showtime.room_id) : null;
            const cinema = room ? getCinemaById(room.cinema_id) : null;
            return {
                ...ticket,
                movie: movie || undefined,
                showtime: showtime || undefined,
                room: room || undefined,
                cinema: cinema || undefined,
            };
        } catch (e) {
            console.warn('Build ticket details error:', e?.message || e);
            return ticket;
        }
    };

    // Normalize scanned data: support booking payload, raw code, numeric id, extended payload (TICKET|code=...), or URL style.
    const extractCode = (raw) => {
        if (!raw) return raw;
        if (raw.startsWith('BOOKING|')) {
            const mId = raw.match(/(?:^|\|)id=(\d+)/);
            if (mId) return `BOOKING_ID_${mId[1]}`;
            const mCode = raw.match(/(?:^|\|)code=([^|]+)/);
            if (mCode) return `BOOKING_CODE_${mCode[1]}`;
        }
        if (raw.startsWith('TICKET|')) {
            const m = raw.match(/(?:^|\|)code=([^|]+)/);
            if (m) return m[1];
        }
        if (/^https?:\/\//i.test(raw)) {
            try {
                const u = new URL(raw);
                // Prefer explicit payload from /ticket/view?text=...
                const txt = u.searchParams.get('text');
                if (txt) {
                    const m = txt.match(/(?:^|\|)code=([^|]+)/);
                    if (m) return m[1];
                }
                // Fallback: use last path segment (for /ticket/:code)
                const lastSeg = u.pathname.split('/').filter(Boolean).pop();
                if (lastSeg && lastSeg !== 'view') return lastSeg;
            } catch (_) { /* ignore */ }
        }
        return raw;
    };

    const handleBarCodeScanned = ({ data }) => {
        if (!scanning) return;
        setScanning(false);
        try {
            const normalized = extractCode(data);
            // Booking-level QR
            if (normalized.startsWith('BOOKING_ID_') || normalized.startsWith('BOOKING_CODE_')) {
                let booking = null;
                if (normalized.startsWith('BOOKING_ID_')) {
                    const id = Number(normalized.replace('BOOKING_ID_', ''));
                    booking = getBookingById(id);
                } else {
                    const code = normalized.replace('BOOKING_CODE_', '');
                    const allB = getAllBookings() || [];
                    booking = allB.find(b => b.booking_code === code);
                }
                if (booking && String(booking.status).toUpperCase() === 'PAID') {
                    navigation.replace('Tickets', { bookingId: booking.id });
                    return;
                }
                // If the scanned data is an URL to backend booking view, offer to open it
                if (/^https?:\/\//i.test(String(data))) {
                    Alert.alert(
                        'QR Booking',
                        'Không tìm thấy booking PAID hợp lệ trong dữ liệu cục bộ. Mở trang chi tiết trên server?',
                        [
                            { text: 'Huỷ', style: 'cancel', onPress: () => setTimeout(() => setScanning(true), 1600) },
                            { text: 'Mở trang', onPress: async () => { try { await Linking.openURL(String(data)); } catch (_) {} } },
                        ],
                        { cancelable: true }
                    );
                    return;
                }
                Alert.alert('QR Booking', 'Không tìm thấy booking PAID hợp lệ.');
                setTimeout(() => setScanning(true), 1600);
                return;
            }
            // Ticket-level QR (legacy support)
            const all = getAllTickets() || [];
            const foundRow = all.find(t => t.qr_code === normalized || String(t.id) === normalized);
            if (foundRow) {
                const detailed = buildTicketDetails(foundRow);
                navigation.replace('TicketDetail', { ticket: detailed });
                return;
            }
            if (/^https?:\/\//i.test(String(data))) {
                Alert.alert(
                    'QR Quét',
                    'Không tìm thấy vé tương ứng trong dữ liệu cục bộ. Mở đường dẫn trên trình duyệt?',
                    [
                        { text: 'Huỷ', style: 'cancel', onPress: () => setTimeout(() => setScanning(true), 1800) },
                        { text: 'Mở trang', onPress: async () => { try { await Linking.openURL(String(data)); } catch (_) {} } },
                    ],
                    { cancelable: true }
                );
                return;
            }
            Alert.alert('QR Quét', `Không khớp mã hợp lệ.\nNội dung quét: ${data}`);
            setTimeout(() => setScanning(true), 1800);
        } catch (e) {
            console.error('Scan error', e);
            Alert.alert('Lỗi quét', String(e));
            setScanning(true);
        }
    };

    if (hasPermission === null) {
        return (
            <View style={[commonStyles.container, styles.center]}>
                <ActivityIndicator />
            </View>
        );
    }

    if (!ScannerComponent) {
        return (
            <View style={[commonStyles.container, styles.manualContainer]}>
                <Text style={styles.hint}>Máy không hỗ trợ camera scanner hoặc module chưa được cài đặt.</Text>
                <Text style={{ marginTop: 12 }}>Bạn có thể dán mã QR (hoặc id vé) vào bên dưới:</Text>
                <TextInput
                    placeholder="Dán mã QR hoặc ID vé"
                    value={manualValue}
                    onChangeText={setManualValue}
                    style={styles.input}
                    autoCapitalize="none"
                />
                <View style={{ flexDirection: 'row', marginTop: 12 }}>
                    <TouchableOpacity
                        style={[styles.btn, { marginRight: 8 }]}
                        onPress={() => {
                            const data = (manualValue || '').trim();
                            if (!data) return Alert.alert('Vui lòng nhập mã');
                            const normalized = extractCode(data);
                            if (normalized.startsWith('BOOKING_ID_') || normalized.startsWith('BOOKING_CODE_')) {
                                let booking = null;
                                if (normalized.startsWith('BOOKING_ID_')) booking = getBookingById(Number(normalized.replace('BOOKING_ID_', '')));
                                else {
                                    const code = normalized.replace('BOOKING_CODE_', '');
                                    booking = (getAllBookings() || []).find(b => b.booking_code === code);
                                }
                                if (booking && String(booking.status).toUpperCase() === 'PAID') {
                                    return navigation.replace('Tickets', { bookingId: booking.id });
                                }
                                if (/^https?:\/\//i.test(String(data))) {
                                    return Alert.alert(
                                        'QR Booking',
                                        'Không tìm thấy booking PAID hợp lệ trong dữ liệu cục bộ. Mở trang chi tiết trên server?',
                                        [
                                            { text: 'Huỷ', style: 'cancel' },
                                            { text: 'Mở trang', onPress: async () => { try { await Linking.openURL(String(data)); } catch (_) {} } },
                                        ]
                                    );
                                }
                                return Alert.alert('Không tìm thấy booking PAID hợp lệ');
                            }
                            const allT = getAllTickets() || [];
                            const foundRow = allT.find(t => t.qr_code === normalized || String(t.id) === normalized);
                            if (foundRow) {
                                const detailed = buildTicketDetails(foundRow);
                                return navigation.replace('TicketDetail', { ticket: detailed });
                            }
                            if (/^https?:\/\//i.test(String(data))) {
                                return Alert.alert(
                                    'QR Quét',
                                    'Không tìm thấy vé tương ứng trong dữ liệu cục bộ. Mở đường dẫn trên trình duyệt?',
                                    [
                                        { text: 'Huỷ', style: 'cancel' },
                                        { text: 'Mở trang', onPress: async () => { try { await Linking.openURL(String(data)); } catch (_) {} } },
                                    ]
                                );
                            }
                            return Alert.alert('Không tìm thấy vé hoặc booking với mã này');
                        }}
                    >
                        <Text style={{ color: '#fff' }}>Tìm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, { backgroundColor: colors.error }]} onPress={() => navigation.goBack()}>
                        <Text style={{ color: '#fff' }}>Huỷ</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const Scanner = ScannerComponent;
    return (
        <View style={styles.container}>
            <Scanner onBarCodeScanned={scanning ? handleBarCodeScanned : undefined} style={StyleSheet.absoluteFillObject} />
            <View style={styles.overlay}>
                <Text style={styles.hint}>Đưa mã QR vào khung để quét</Text>
                <TouchableOpacity style={styles.cancel} onPress={() => navigation.goBack()}>
                    <Text style={{ color: '#fff' }}>Huỷ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    manualContainer: { padding: 16 },
    overlay: { position: 'absolute', left: 0, right: 0, bottom: 30, alignItems: 'center' },
    hint: { color: '#fff', fontSize: 16, marginBottom: 12 },
    cancel: { backgroundColor: colors.error, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
    input: { marginTop: 12, borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, backgroundColor: '#fff' },

    btn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
});





