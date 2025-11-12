import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import { getSeatById } from '../database/seatDB';
import { getShowtimeById } from '../database/showtimeDB';
import { getRoomById } from '../database/roomDB';
import { getCinemaById } from '../database/db';
import { SvgXml } from 'react-native-svg';
import QRCode from 'qrcode';
import { getApiBase } from '../payment/payment-vnpay';

export default function TicketDetailScreen({ route, navigation }) {
    const { ticket } = route.params || {};
    const [svgXml, setSvgXml] = useState('');
    const [qrContent, setQrContent] = useState('');

    // Derive seat label (e.g., A1) and cinema/room info for display
    const details = useMemo(() => {
        if (!ticket) return {};
        try {
            const st = ticket.showtime || getShowtimeById(ticket.showtime_id) || null;
            const room = ticket.room || (st ? getRoomById(st.room_id) : null);
            const cinema = ticket.cinema || (room ? getCinemaById(room.cinema_id) : null);
            const seat = getSeatById(ticket.seat_id);
            const seatLabel = seat ? `${seat.row_label}${seat.seat_number}` : `#${ticket.seat_id}`;
            const roomName = room?.name || (st?.room_id ? `Phòng ${st.room_id}` : 'Phòng ?');
            const cinemaName = cinema?.name || 'Rạp không xác định';
            const cinemaAddr = cinema?.address || '';
            return { st, room, cinema, seat, seatLabel, roomName, cinemaName, cinemaAddr };
        } catch (_) {
            return {};
        }
    }, [ticket]);

    // Build an external-friendly payload and QR URL
    const payload = useMemo(() => {
        if (!ticket) return '';
        const safe = (v) => (v == null ? '' : String(v).replace(/\|/g, ' '));
        const movieTitle = safe(ticket.movie?.title || '');
        const time = safe(details.st?.start_time || ticket.showtime?.start_time || '');
        const seatLabel = safe(details?.seatLabel || `#${ticket.seat_id}`);
        const code = safe(ticket.qr_code || ticket.id);
        const cinemaName = safe(details.cinemaName || '');
        const cinemaAddr = safe(details.cinemaAddr || '');
        const roomName = safe(details.roomName || '');
        const price = safe(ticket.price_paid || '');
        const status = safe(ticket.status || '');
        return `TICKET|code=${code}|id=${ticket.id}|seat=${seatLabel}|movie=${movieTitle}|time=${time}|cinema=${cinemaName}|cinemaAddr=${cinemaAddr}|room=${roomName}|price=${price}|status=${status}`;
    }, [ticket, details]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (!ticket) return;
                const apiBase = getApiBase?.() || '';
                const url = apiBase ? `${apiBase}/ticket/view?text=${encodeURIComponent(payload)}` : '';
                const toEncode = url || payload;
                const svg = await QRCode.toString(String(toEncode), { type: 'svg', margin: 0, width: 220 });
                if (mounted) {
                    setSvgXml(svg);
                    setQrContent(toEncode);
                }
            } catch (e) {
                console.warn('QR generate error:', e?.message || e);
            }
        })();
        return () => { mounted = false; };
    }, [ticket, payload]);

    // No QR display per requirement; this screen focuses on readable ticket info.

    if (!ticket) {
        return (
            <View style={[commonStyles.container, styles.container]}>
                <Text>Không tìm thấy vé.</Text>
            </View>
        );
    }

    const onShare = () => {
        Alert.alert('Chia sẻ', 'Tính năng chia sẻ tạm chưa triển khai');
    };

    return (
        <View style={[commonStyles.container, styles.container]}>
            <Text style={styles.title}>Quét mã QR để xem chi tiết vé trên web</Text>
            {svgXml ? (
                <View style={styles.qrBox}>
                    <SvgXml xml={svgXml} width={220} height={220} />
                    <Text style={styles.qrHint}>Dùng camera hoặc ứng dụng quét QR để mở trang thông tin vé.</Text>
                </View>
            ) : null}
            <TouchableOpacity style={styles.btn} onPress={onShare}>
                <Text style={styles.btnText}>Chia sẻ / Lưu</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 200, alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
    meta: { color: colors.textSecondary, marginBottom: 12 },
    empty: { color: colors.textSecondary },
    qrBox: { padding: 12, backgroundColor: colors.surface, borderRadius: 12, marginTop: 16, alignItems: 'center' },
    qrHint: { marginTop: 8, fontSize: 12, color: colors.textSecondary },
    small: { color: colors.textSecondary, marginTop: 8 },
    btn: { marginTop: 24, backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
    btnText: { color: '#fff', fontWeight: '700' },
});
