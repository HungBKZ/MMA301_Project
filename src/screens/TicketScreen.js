import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import { useAuth } from '../auth/AuthContext';
import { getAllTickets, getTicketsByBookingId } from '../database/ticketDB';
import { getShowtimeById } from '../database/showtimeDB';
import { getMovieById } from '../database/db';
import { getAllBookings, getBookingById } from '../database/bookingDB';
import { getSeatById } from '../database/seatDB';
import { getRoomById } from '../database/roomDB';
import { getCinemaById } from '../database/db';
import { SvgXml } from 'react-native-svg';
import QRCode from 'qrcode';
import { getApiBase } from '../payment/payment-vnpay';

export default function TicketScreen({ navigation, route }) {
  const { user } = useAuth();

  // MODE: 'BOOKINGS' | 'TICKETS'
  const [mode, setMode] = useState('BOOKINGS');
  const [bookings, setBookings] = useState([]); // enriched bookings
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [tickets, setTickets] = useState([]); // tickets for selected booking
  const [loading, setLoading] = useState(false);
  const [bookingQrXml, setBookingQrXml] = useState('');

  useEffect(() => {
    loadBookings();
    const unsub = navigation.addListener('focus', () => {
      // reload depending on mode
      if (mode === 'BOOKINGS') loadBookings();
      else if (selectedBooking) loadTicketsForBooking(selectedBooking.id);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedBooking]);

  // If navigated with bookingId (from scanner), auto-open that booking
  useEffect(() => {
    const bid = route?.params?.bookingId;
    if (bid) {
      try {
        const b = getBookingById(bid);
        if (b && String(b.status).toUpperCase() === 'PAID') {
          const eb = enrichBooking(b);
          setSelectedBooking(eb);
          setMode('TICKETS');
          loadTicketsForBooking(b.id);
        }
      } catch (_) {}
    }
    // We don't want to re-run when selectedBooking changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.bookingId]);

  const formatVND = (n) => (n || 0).toLocaleString('vi-VN') + 'đ';

  const enrichBooking = (b) => {
    const st = getShowtimeById(b.showtime_id) || {};
    const movie = getMovieById(st.movie_id) || {};
    const room = st ? getRoomById(st.room_id) || {} : {};
    const cinema = room ? getCinemaById(room.cinema_id) || {} : {};
    const allTickets = getTicketsByBookingId(b.id) || [];
    const paidCount = allTickets.filter(t => t.status === 'PAID').length;
    return { ...b, showtime: st, movie, room, cinema, ticketsCount: allTickets.length, paidCount };
  };

  const enrichTicket = (t) => {
    const st = getShowtimeById(t.showtime_id) || {};
    const movie = getMovieById(st.movie_id) || {};
    const bk = t.booking_id ? getBookingById(t.booking_id) : null;
    const seat = getSeatById(t.seat_id);
    const seatLabel = seat ? `${seat.row_label}${seat.seat_number}` : `#${t.seat_id}`;
    return { ...t, showtime: st, movie, booking: bk, seatLabel };
  };

  const loadBookings = () => {
    if (!user) { setBookings([]); return; }
    try {
      setLoading(true);
      const all = getAllBookings() || [];
      // Show only bookings belonging to user (if user_id is set) OR bookings where tickets have user_id == user.id
      const filtered = all.filter(b => {
        // only show PAID bookings
        if (String(b.status).toUpperCase() !== 'PAID') return false;
        // ownership check
        if (b.user_id && Number(b.user_id) === Number(user.id)) return true;
        const tk = getTicketsByBookingId(b.id) || [];
        return tk.some(t => t.user_id && Number(t.user_id) === Number(user.id));
      }).map(enrichBooking);
      // Sort newest first already via query, keep as is
      setBookings(filtered);
    } catch (e) {
      console.error('Load bookings error', e);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketsForBooking = (bookingId) => {
    try {
      setLoading(true);
      const raw = getTicketsByBookingId(bookingId) || [];
      // show all tickets for that booking (both PAID & HELD) so user sees đủ số lượng vé
      const enriched = raw.map(enrichTicket);
      setTickets(enriched);
    } catch (e) {
      console.error('Load tickets for booking error', e);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBooking = (b) => {
    setSelectedBooking(b);
    setMode('TICKETS');
    loadTicketsForBooking(b.id);
    generateBookingQr(b);
  };

  const handleBack = () => {
    setMode('BOOKINGS');
    setSelectedBooking(null);
    setTickets([]);
    setBookingQrXml('');
  };

  // Build booking QR code once a booking is selected
  const generateBookingQr = async (booking) => {
    if (!booking) return;
    try {
      // Build seats list labels
      const rawTickets = getTicketsByBookingId(booking.id) || [];
      const seatLabels = rawTickets.map(t => {
        const s = getSeatById(t.seat_id);
        return s ? `${s.row_label}${s.seat_number}` : `#${t.seat_id}`;
      }).join(',');
      const safe = (v) => (v == null ? '' : String(v).replace(/\|/g, ' '));
      const payload = `BOOKING|code=${safe(booking.booking_code)}|id=${booking.id}|movie=${safe(booking.movie?.title)}|time=${safe(booking.showtime?.start_time)}|cinema=${safe(booking.cinema?.name)}|room=${safe(booking.showtime?.room_id)}|seats=${safe(seatLabels)}|count=${booking.ticketsCount}|paid=${booking.paidCount}`;
      // Prefer generating a link to backend HTML for cross-device scanners
      const apiBase = getApiBase?.();
      const toEncode = apiBase ? `${apiBase}/booking/view?text=${encodeURIComponent(payload)}` : payload;
      const svg = await QRCode.toString(toEncode, { type: 'svg', margin: 0, width: 200 });
      setBookingQrXml(svg);
    } catch (e) {
      console.warn('Booking QR error', e?.message || e);
      setBookingQrXml('');
    }
  };

  // Render booking list item
  const renderBookingItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleSelectBooking(item)}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.movie?.title || 'Unknown movie'}</Text>
          <Text style={styles.meta}>Mã đặt: {item.booking_code}</Text>
          <Text style={styles.meta}>{item.showtime?.start_time || ''} — Phòng {item.showtime?.room_id}</Text>
          <Text style={styles.meta}>Trạng thái: <Text style={item.status === 'PAID' ? styles.paid : styles.held}>{item.status}</Text></Text>
        </View>
        <View style={{ alignItems: 'flex-end', minWidth: 90 }}>
          <Text style={styles.meta}>Vé: {item.ticketsCount}</Text>
          <Text style={styles.meta}>Đã thanh toán: {item.paidCount}</Text>
          <Text style={styles.meta}>Tổng: {formatVND(item.final_amount)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render ticket item inside a booking
  const renderTicketItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('TicketDetail', { ticket: item })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Ghế {item.seatLabel}</Text>
          <Text style={styles.meta}>{item.showtime?.start_time || ''} — Phòng {item.showtime?.room_id}</Text>
          <Text style={styles.meta}>Giá: {formatVND(item.price_paid)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.status, item.status === 'PAID' ? styles.paid : styles.held]}>{item.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[commonStyles.container, styles.container]}>
      {mode === 'BOOKINGS' && (
        <>
          <Text style={styles.heading}>Đặt chỗ của tôi</Text>
          {!user && <Text style={styles.empty}>Bạn chưa đăng nhập.</Text>}
          {user && !loading && bookings.length === 0 && <Text style={styles.empty}>Không có đặt chỗ.</Text>}
          <FlatList
            data={bookings}
            keyExtractor={(i) => `booking-${i.id}`}
            renderItem={renderBookingItem}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </>
      )}
      {mode === 'TICKETS' && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Text style={styles.backText}>← Quay lại</Text>
            </TouchableOpacity>
            <Text style={[styles.heading, { flex: 1 }]}>Danh sách vé</Text>
          </View>
          {selectedBooking && (
            <View style={styles.bookingInfo}>
              <Text style={styles.meta}>Mã đặt: {selectedBooking.booking_code}</Text>
              <Text style={styles.meta}>Phim: {selectedBooking.movie?.title}</Text>
              <Text style={styles.meta}>Suất: {selectedBooking.showtime?.start_time} — Phòng {selectedBooking.showtime?.room_id}</Text>
              {selectedBooking.cinema?.name ? (
                <>
                  <Text style={styles.meta}>Rạp: {selectedBooking.cinema?.name}</Text>
                  <Text style={styles.meta}>Địa chỉ: {selectedBooking.cinema?.address || ''}</Text>
                </>
              ) : null}
              <Text style={styles.meta}>Tổng tiền: {formatVND(selectedBooking.final_amount)}</Text>
              <Text style={styles.meta}>Số vé: {selectedBooking.ticketsCount} (Đã thanh toán {selectedBooking.paidCount})</Text>
              {bookingQrXml ? (
                <View style={styles.qrBox}>
                  <SvgXml xml={bookingQrXml} width={200} height={200} />
                  <Text style={styles.meta}>Quét mã QR đặt chỗ này để hiện danh sách vé</Text>
                </View>
              ) : null}
            </View>
          )}
          {!loading && tickets.length === 0 && <Text style={styles.empty}>Không có vé trong đặt chỗ này.</Text>}
          <FlatList
            data={tickets}
            keyExtractor={(i) => `ticket-${i.id}`}
            renderItem={renderTicketItem}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </>
      )}
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
  backBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  backText: { fontSize: 12, color: colors.textPrimary },
  bookingInfo: { backgroundColor: colors.surfaceAlt || colors.surface, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  qrBox: { marginTop: 12, padding: 12, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
});
