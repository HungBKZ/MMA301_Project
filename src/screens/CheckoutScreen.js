import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import { useAuth } from '../auth/AuthContext';
import { getSeatsByRoom } from '../database/seatDB';
import { addBooking, deleteBooking, getBookingById, updateBooking } from '../database/bookingDB';
import { addTicket, deleteTicket, getTicketsByBookingId, updateTicket } from '../database/ticketDB';

// Checkout screen tạo booking và tickets từ dữ liệu ghế đã chọn
export default function CheckoutScreen({ route, navigation }) {
	const { user } = useAuth();
	const {
		showtimeId,
		roomId,
		movieTitle,
		cinemaName,
		startTime,
		basePrice = 120000,
		selectedSeatIds = [],
		summary = { totalSeats: 0, totalPrice: 0 },
	} = route.params || {};

		const [loading, setLoading] = useState(false);
	const [seatsMap, setSeatsMap] = useState({});
	const [error, setError] = useState(null);
		const [bookingId, setBookingId] = useState(null);
		const [isPaid, setIsPaid] = useState(false);
		const [initializingHold, setInitializingHold] = useState(true);

	useEffect(() => {
		try {
			const seats = getSeatsByRoom(roomId) || [];
			const m = {};
			seats.forEach(s => { m[s.id] = s; });
			setSeatsMap(m);
		} catch (e) {
			setSeatsMap({});
		}
	}, [roomId]);

	const selectedSeatsDetailed = useMemo(() => {
		return selectedSeatIds
			.map(id => seatsMap[id])
			.filter(Boolean)
			.sort((a, b) => a.row_label.localeCompare(b.row_label) || a.seat_number - b.seat_number);
	}, [selectedSeatIds, seatsMap]);

	const formatVND = (n) => (n || 0).toLocaleString('vi-VN') + 'đ';

	// Re-tính chi tiết số tiền theo loại ghế để hiển thị breakdown
	const priceCfg = { STANDARD: 1.0, VIP: 1.2, COUPLE: 1.5, ACCESSIBLE: 1.0 };

	const breakdown = useMemo(() => {
		let total = 0;
		const lines = [];
		// Couple seat logic: nếu ghế couple có số lẻ + ghế kế tiếp số chẵn cùng COUPLE đều được chọn -> ticket đôi
		const byRow = selectedSeatsDetailed.reduce((acc, s) => {
			acc[s.row_label] = acc[s.row_label] || [];
			acc[s.row_label].push(s);
			return acc;
		}, {});
		Object.keys(byRow).forEach(label => byRow[label].sort((a, b) => a.seat_number - b.seat_number));

		for (const label of Object.keys(byRow)) {
			const arr = byRow[label];
			for (let i = 0; i < arr.length; i++) {
				const s = arr[i];
				if (s.seat_type === 'COUPLE' && s.seat_number % 2 === 1) {
					const next = arr.find(x => x.seat_number === s.seat_number + 1 && x.seat_type === 'COUPLE');
					const bothSelected = next && selectedSeatIds.includes(s.id) && selectedSeatIds.includes(next.id);
						if (bothSelected) {
							const linePrice = basePrice * 2 * priceCfg.COUPLE;
							total += linePrice;
							lines.push({ label: `${label}${s.seat_number}-${next.seat_number} (COUPLE)`, price: linePrice });
							i = arr.indexOf(next); // skip next
							continue;
						}
				}
				const mult = priceCfg[s.seat_type] || 1.0;
				const linePrice = basePrice * mult;
				total += linePrice;
				lines.push({ label: `${s.row_label}${s.seat_number} (${s.seat_type})`, price: linePrice });
			}
		}
		return { lines, total };
	}, [selectedSeatsDetailed, basePrice, selectedSeatIds]);

		// Hold configuration
		const HOLD_MINUTES = 10;
		const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);
		const formatDateTime = (d) => {
			const pad = (n) => String(n).padStart(2, '0');
			return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
		};

		// Create hold on mount (booking PENDING + tickets HELD)
		useEffect(() => {
			let cancelled = false;
			const createHold = async () => {
				if (!showtimeId || !roomId || !selectedSeatIds.length) {
					setInitializingHold(false);
					return;
				}
				try {
					setError(null);
					setInitializingHold(true);
					const now = new Date();
					const expires = addMinutes(now, HOLD_MINUTES);
					const holdExpires = formatDateTime(expires);

					// Booking code (temporary)
					const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
					const rand = Math.floor(Math.random() * 9000) + 1000;
					const booking_code = `BK-${stamp}-${rand}`;

					const userId = user?.id ?? null;
					// Create PENDING booking to group tickets
					const addRes = addBooking(booking_code, userId, showtimeId, 'PENDING', breakdown.total, 0, breakdown.total, 'NONE', null, holdExpires, `${selectedSeatIds.length} tickets ${movieTitle || ''}`);
					if (!addRes.success) throw new Error('Cannot initialize seat hold');
					const newBookingId = addRes.id;

					// Tạo tickets HELD
					const created = [];
					for (const line of breakdown.lines) {
						if (line.label.includes('COUPLE')) {
							const parts = line.label.split(' ')[0]; // e.g., G1-2
							const row = parts[0];
							const nums = parts.slice(1).split('-').map(n => parseInt(n, 10));
							const left = selectedSeatsDetailed.find(s => s.row_label === row && s.seat_number === nums[0]);
							const right = selectedSeatsDetailed.find(s => s.row_label === row && s.seat_number === nums[1]);
							if (left && right) {
								const perSeatPrice = line.price / 2;
								const r1 = addTicket(showtimeId, left.id, newBookingId, userId, perSeatPrice, 'HELD', holdExpires, `QR-${booking_code}-${row}${nums[0]}`, null);
								if (!r1.success) throw new Error('Some seats are already held by others');
								created.push(r1.id);
								const r2 = addTicket(showtimeId, right.id, newBookingId, userId, perSeatPrice, 'HELD', holdExpires, `QR-${booking_code}-${row}${nums[1]}`, null);
								if (!r2.success) throw new Error('Some seats are already held by others');
								created.push(r2.id);
							}
						} else {
							const parts = line.label.split(' ');
							const pos = parts[0];
							const row = pos[0];
							const num = parseInt(pos.slice(1), 10);
							const seatObj = selectedSeatsDetailed.find(s => s.row_label === row && s.seat_number === num);
							if (seatObj) {
								const r = addTicket(showtimeId, seatObj.id, newBookingId, userId, line.price, 'HELD', holdExpires, `QR-${booking_code}-${row}${num}`, null);
								if (!r.success) throw new Error('Some seats are already held by others');
								created.push(r.id);
							}
						}
					}
					if (cancelled) return;
					setBookingId(newBookingId);
				} catch (e) {
					console.error('Hold error:', e);
					setError(e.message || 'Cannot hold seats');
					Alert.alert('Seat Hold Failed', e.message || 'Please select again', [
						{ text: 'OK', onPress: () => navigation.goBack() }
					]);
				} finally {
					if (!cancelled) setInitializingHold(false);
				}
			};
			createHold();
			return () => { cancelled = true; };
		}, [showtimeId, roomId, selectedSeatIds, breakdown.total]);

		// Release hold helper
		const releaseHold = () => {
			if (!bookingId) return;
			try {
				const tickets = getTicketsByBookingId(bookingId) || [];
				tickets.forEach(t => deleteTicket(t.id));
				deleteBooking(bookingId);
			} catch (e) {
				// ignore errors during cleanup
			}
		};

		// Intercept back to release holds if not paid
		useEffect(() => {
			const unsub = navigation.addListener('beforeRemove', (e) => {
				if (!bookingId || isPaid) return; // no hold or already paid
				e.preventDefault();
				Alert.alert('Cancel Seat Hold?', 'You will lose your seat reservation if you leave this page.', [
					{ text: 'Stay', style: 'cancel' },
					{
						text: 'Cancel & Leave', style: 'destructive', onPress: () => {
							releaseHold();
							navigation.dispatch(e.data.action);
						}
					}
				]);
			});
			return unsub;
		}, [navigation, bookingId, isPaid]);

			const onConfirm = async () => {
				if (!bookingId) return;
				setLoading(true);
				setError(null);
				try {
					// 1) Update all tickets in this booking to PAID
					const tickets = getTicketsByBookingId(bookingId) || [];
					for (const t of tickets) {
						const fields = {
							showtime_id: t.showtime_id,
							seat_id: t.seat_id,
							booking_id: t.booking_id,
							user_id: t.user_id,
							price_paid: t.price_paid,
							status: 'PAID',
							hold_expires_at: null,
							qr_code: t.qr_code,
							checked_in_at: t.checked_in_at,
						};
						const r = updateTicket(t.id, fields);
						if (!r.success) throw new Error('Cannot update ticket');
					}

					// 2) Update booking to PAID
					const bk = getBookingById(bookingId);
					if (!bk) throw new Error('Booking not found');
					const updateRes = updateBooking(bookingId, {
						booking_code: bk.booking_code,
						user_id: bk.user_id,
						showtime_id: bk.showtime_id,
						status: 'PAID',
						total_amount: bk.total_amount,
						discount_amount: bk.discount_amount,
						final_amount: bk.final_amount,
						payment_method: 'CASH',
						payment_reference: null,
						hold_expires_at: null,
						notes: bk.notes,
					});
					if (!updateRes.success) throw new Error('Cannot confirm payment');

					setIsPaid(true);
					Alert.alert('Success', 'Payment successful. Tickets have been confirmed.');
					navigation.popToTop();
				} catch (e) {
					console.error('Confirm error:', e);
					setError(e.message || 'Cannot complete payment');
					Alert.alert('Error', e.message || 'Payment failed');
				} finally {
					setLoading(false);
				}
			};

	return (
		<View style={[commonStyles.container, styles.container]}>      
					<ScrollView contentContainerStyle={styles.scroll}>
				<Text style={styles.heading}>Confirm Booking</Text>
				{movieTitle && <Text style={styles.movie}>{movieTitle}</Text>}
				{cinemaName && <Text style={styles.meta}>{cinemaName}</Text>}
				{startTime && <Text style={styles.meta}>{startTime}</Text>}
				<Text style={styles.meta}>Room: {roomId}</Text>
				<View style={styles.divider} />
				<Text style={styles.sectionTitle}>Selected Seats ({selectedSeatIds.length})</Text>
				{selectedSeatsDetailed.length === 0 && <Text style={styles.empty}>No seats selected.</Text>}
						{breakdown.lines.map((l, idx) => (
					<View key={idx} style={styles.lineRow}>
						<Text style={styles.lineLabel}>{l.label}</Text>
						<Text style={styles.linePrice}>{formatVND(l.price)}</Text>
					</View>
				))}
				<View style={styles.divider} />
				<View style={styles.totalRow}>
					<Text style={styles.totalLabel}>Subtotal</Text>
					<Text style={styles.totalValue}>{formatVND(breakdown.total)}</Text>
				</View>
				<View style={styles.totalRow}>
					<Text style={styles.totalLabel}>Discount</Text>
					<Text style={[styles.totalValue, { color: colors.success }]}>0đ</Text>
				</View>
				<View style={styles.totalRow}>
					<Text style={styles.grandLabel}>Total Payment</Text>
					<Text style={styles.grandValue}>{formatVND(breakdown.total)}</Text>
				</View>
				{error && <Text style={styles.error}>{error}</Text>}
			</ScrollView>
					<View style={styles.bottomBar}>
						<TouchableOpacity
							style={[styles.payBtn, { opacity: loading || initializingHold ? 0.7 : 1 }]}
							disabled={loading || initializingHold}
							onPress={onConfirm}
						>
							{loading || initializingHold ? <ActivityIndicator color="#fff" /> : <Text style={styles.payText}>Confirm & Pay</Text>}
						</TouchableOpacity>
					</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { padding: 16 },
	scroll: { paddingBottom: 40 },
	heading: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
	movie: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginBottom: 2 },
	meta: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
	divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
	sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
	empty: { color: colors.textSecondary, fontStyle: 'italic' },
	lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
	lineLabel: { color: colors.textPrimary, fontSize: 13 },
	linePrice: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
	totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
	totalLabel: { color: colors.textSecondary, fontSize: 13 },
	totalValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
	grandLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
	grandValue: { color: colors.primary, fontSize: 16, fontWeight: '700' },
	bottomBar: { padding: 12, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
	payBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
	payText: { color: '#fff', fontWeight: '700' },
	error: { color: colors.error, marginTop: 8 },
});

