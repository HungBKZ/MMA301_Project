import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import { useAuth } from '../auth/AuthContext';
import { getAllTickets } from '../database/ticketDB';
import { getShowtimeById } from '../database/showtimeDB';
import { getMovieById } from '../database/db';
import { getBookingById } from '../database/bookingDB';
import { getSeatById } from '../database/seatDB';

export default function TicketScreen({ navigation, route }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    loadTickets();
    const unsub = navigation.addListener('focus', () => loadTickets());
    return unsub;
  }, []);

  const loadTickets = () => {
    try {
      const all = getAllTickets() || [];
      // Filter tickets belonging to current user
      const mine = all.filter(t => {
        // only show PAID tickets
        if (t.status !== 'PAID') return false;
        if (!user) return false;
        if (t.user_id && Number(t.user_id) === Number(user.id)) return true;
        // fallback: check booking's user
        if (t.booking_id) {
          const bk = getBookingById(t.booking_id);
          if (bk && bk.user_id && Number(bk.user_id) === Number(user.id)) return true;
        }
        return false;
      }).map(t => enrichTicket(t));
      setTickets(mine);
    } catch (e) {
      console.error('Load tickets error', e);
      setTickets([]);
    }
  };

  const enrichTicket = (t) => {
    const st = getShowtimeById(t.showtime_id) || {};
    const movie = getMovieById(st.movie_id) || {};
    const bk = t.booking_id ? getBookingById(t.booking_id) : null;
    const seat = getSeatById(t.seat_id);
    const seatLabel = seat ? `${seat.row_label}${seat.seat_number}` : `#${t.seat_id}`;
    return { ...t, showtime: st, movie, booking: bk, seatLabel };
  };

  const formatVND = (n) => (n || 0).toLocaleString('vi-VN') + 'đ';

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('TicketDetail', { ticket: item })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Text style={styles.title}>{item.movie?.title || 'Unknown movie'}</Text>
          <Text style={styles.meta}>{item.showtime?.start_time || ''} — Phòng {item.showtime?.room_id}</Text>
          <Text style={styles.meta}>Ghế: {item.seatLabel} — Giá: {formatVND(item.price_paid)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.status, item.status === 'PAID' ? styles.paid : styles.held]}>{item.status}</Text>
          <Text style={styles.small}>{item.qr_code || ''}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const showTicketDetail = (t) => {
    navigation.navigate('TicketDetail', { ticket: t });
  };

  return (
    <View style={[commonStyles.container, styles.container]}>
      <Text style={styles.heading}>Vé của tôi</Text>
      {!user && <Text style={styles.empty}>Bạn chưa đăng nhập.</Text>}
      {user && tickets.length === 0 && <Text style={styles.empty}>Không có vé.</Text>}
      <FlatList
        data={tickets}
        keyExtractor={(i) => `ticket-${i.id}`}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  heading: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: colors.textPrimary },
  card: { backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginVertical: 8, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  status: { fontWeight: '700', marginTop: 6 },
  paid: { color: colors.success },
  held: { color: colors.warning },
  small: { fontSize: 11, color: colors.textSecondary, marginTop: 6 },
  empty: { color: colors.textSecondary, fontStyle: 'italic' },
});
