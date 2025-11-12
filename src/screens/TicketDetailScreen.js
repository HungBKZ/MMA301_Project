import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import { getSeatById } from '../database/seatDB';
import { getShowtimeById } from '../database/showtimeDB';
import { getRoomById } from '../database/roomDB';
import { getCinemaById } from '../database/db';

export default function TicketDetailScreen({ route, navigation }) {
    const { ticket } = route.params || {};

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

    // No QR display per requirement; only readable ticket info.

    if (!ticket) {
        return (
            <View style={[commonStyles.container, styles.container]}>
                <Text>Không tìm thấy vé.</Text>
            </View>
        );
    }

    return (
        <View style={[commonStyles.container, styles.container]}>
            <Text style={styles.title}>Chi tiết vé</Text>
            <Text style={styles.meta}>Phim: {ticket?.movie?.title || '...'}</Text>
            <Text style={styles.meta}>Suất: {details?.st?.start_time || ticket?.showtime?.start_time || ''}</Text>
            <Text style={styles.meta}>Rạp: {details?.cinemaName || ''}</Text>
            <Text style={styles.meta}>Địa chỉ: {details?.cinemaAddr || ''}</Text>
            <Text style={styles.meta}>Phòng: {details?.roomName || ''}</Text>
            <Text style={styles.meta}>Ghế: {details?.seatLabel || `#${ticket?.seat_id}`}</Text>
            <Text style={styles.meta}>Giá: {(ticket?.price_paid || 0).toLocaleString('vi-VN')}đ</Text>
            <Text style={styles.meta}>Trạng thái: {ticket?.status}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16 },
    title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
    meta: { color: colors.textSecondary, marginBottom: 12 },
    empty: { color: colors.textSecondary },
    small: { color: colors.textSecondary, marginTop: 8 },
});
