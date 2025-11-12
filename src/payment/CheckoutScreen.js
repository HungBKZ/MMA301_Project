import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import { useAuth } from '../auth/AuthContext';
import { getSeatsByRoom } from '../database/seatDB';
import { addBooking, deleteBooking, getBookingById, updateBooking } from '../database/bookingDB';
import { addTicket, deleteTicket, getTicketsByBookingId, updateTicket } from '../database/ticketDB';
import { startPayment } from '../services/paymentService';
import { startVnpayPayment, subscribePaymentReturn, resolveApiBase, getApiBase } from './payment-vnpay';
import VnpayWebView from './VnpayWebView';

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
    const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH | MOMO | BANK | VNPAY
    const [payingExternal, setPayingExternal] = useState(false);
    const [initializingHold, setInitializingHold] = useState(true);
    const [unsubscribeReturn, setUnsubscribeReturn] = useState(null);
    const [showVnpWebView, setShowVnpWebView] = useState(false);
    const [vnpPayUrl, setVnpPayUrl] = useState('');

    // Ref used to bypass the beforeRemove confirmation for programmatic payment/navigation
    const allowLeaveRef = useRef(false);

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
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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
                const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                const rand = Math.floor(Math.random() * 9000) + 1000;
                const booking_code = `BK-${stamp}-${rand}`;

                const userId = user?.id ?? null;
                // Tạo booking PENDING để gom tickets
                const addRes = addBooking(booking_code, userId, showtimeId, 'PENDING', breakdown.total, 0, breakdown.total, 'NONE', null, holdExpires, `${selectedSeatIds.length} vé ${movieTitle || ''}`);
                if (!addRes.success) throw new Error('Không thể khởi tạo giữ ghế');
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
                            if (!r1.success) throw new Error('Một số ghế đã được giữ bởi người khác');
                            created.push(r1.id);
                            const r2 = addTicket(showtimeId, right.id, newBookingId, userId, perSeatPrice, 'HELD', holdExpires, `QR-${booking_code}-${row}${nums[1]}`, null);
                            if (!r2.success) throw new Error('Một số ghế đã được giữ bởi người khác');
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
                            if (!r.success) throw new Error('Một số ghế đã được giữ bởi người khác');
                            created.push(r.id);
                        }
                    }
                }
                if (cancelled) return;
                setBookingId(newBookingId);
            } catch (e) {
                console.error('Hold error:', e);
                setError(e.message || 'Không thể giữ ghế');
                Alert.alert('Giữ ghế thất bại', e.message || 'Vui lòng chọn lại', [
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
        // allowLeaveRef lets app-initiated navigations (payment flows) bypass the confirmation
        const unsub = navigation.addListener('beforeRemove', (e) => {
            if (!bookingId || isPaid || allowLeaveRef.current) return; // no hold, already paid, or allowed programmatic leave
            e.preventDefault();
            Alert.alert('Huỷ giữ ghế?', 'Bạn sẽ mất giữ chỗ nếu rời trang này.', [
                { text: 'Ở lại', style: 'cancel' },
                {
                    text: 'Huỷ và rời', style: 'destructive', onPress: () => {
                        releaseHold();
                        navigation.dispatch(e.data.action);
                    }
                }
            ]);
        });
        return unsub;
    }, [navigation, bookingId, isPaid]);

    // Ref used to bypass the beforeRemove confirmation for programmatic payment/navigation

    const finalizePaid = async (opts = {}) => {
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
                if (!r.success) throw new Error('Không thể cập nhật vé');
            }

            // 2) Update booking to PAID
            const bk = getBookingById(bookingId);
            if (!bk) throw new Error('Không tìm thấy booking');
            // Preserve payment method/reference if already set (e.g., VNPAY flow)
            const newPaymentMethod = opts?.payment_method ?? bk.payment_method ?? 'CASH';
            const newPaymentRef = opts?.payment_reference ?? bk.payment_reference ?? null;
            const updateRes = updateBooking(bookingId, {
                booking_code: bk.booking_code,
                user_id: bk.user_id,
                showtime_id: bk.showtime_id,
                status: 'PAID',
                total_amount: bk.total_amount,
                discount_amount: bk.discount_amount,
                final_amount: bk.final_amount,
                payment_method: newPaymentMethod,
                payment_reference: newPaymentRef,
                hold_expires_at: null,
                notes: bk.notes,
            });
            if (!updateRes.success) throw new Error('Không thể xác nhận thanh toán');

            setIsPaid(true);
            Alert.alert('Thành công', 'Thanh toán thành công. Vé đã được xác nhận.');
            navigation.popToTop();
        } catch (e) {
            console.error('Confirm error:', e);
            setError(e.message || 'Không thể hoàn tất thanh toán');
            Alert.alert('Lỗi', e.message || 'Thanh toán thất bại');
        } finally {
            setLoading(false);
        }
    };

    const onConfirm = async () => {
        if (!bookingId) return;
        if (paymentMethod === 'CASH') {
            // Allow programmatic leave (confirming payment) so beforeRemove won't block
            allowLeaveRef.current = true;
            return finalizePaid({ payment_method: 'CASH', payment_reference: null });
        }
        // VNPay flow (WebView embed)
        if (paymentMethod === 'VNPAY' || paymentMethod === 'BANK') {
            setPayingExternal(true);
            try {
                // Allow navigation for external payment flows
                allowLeaveRef.current = true;
                const bk = getBookingById(bookingId);
                if (!bk) throw new Error('Booking không tồn tại');

                // Determine API base (prefer app.json extra.API_BASE, else Metro host)
                const apiBase = getApiBase();
                // Ensure integer VND amount and include default bankCode for BANK flow
                const vnpAmount = Math.round(Number(bk.final_amount || 0));
                const vnpBankCode = (paymentMethod === 'BANK') ? 'NCB' : undefined; // VNPay sandbox ATM test bank
                console.log('VNPay request payload:', { bookingId, vnpAmount, orderInfo: bk.notes, bankCode: vnpBankCode, apiBase });

                const r = await startVnpayPayment({
                    apiBase,
                    amount: vnpAmount || 100000,
                    orderId: String(bookingId),
                    orderInfo: bk.notes || 'Movie tickets',
                    bankCode: vnpBankCode,
                    useWebView: true,
                });
                setVnpPayUrl(r?.payUrl || '');
                setShowVnpWebView(true);
            } catch (e) {
                console.error('VNPay payment error', e);
                Alert.alert('Lỗi', e.message || 'Thanh toán không thành công');
                setPayingExternal(false);
                allowLeaveRef.current = false;
            }
            return;
        }

        // Other external gateways (mock)
        setPayingExternal(true);
        try {
            // Allow navigation for external payment flows
            allowLeaveRef.current = true;
            const bk = getBookingById(bookingId);
            if (!bk) throw new Error('Booking không tồn tại');
            const result = await startPayment(paymentMethod, {
                amount: bk.final_amount,
                orderId: String(bookingId),
                orderInfo: bk.notes || 'Movie tickets',
                returnUrl: 'app://checkout/return'
            });
            if (!result.success) throw new Error(result.message || 'Không tạo được phiên thanh toán');
            if (!result.paid) {
                Alert.alert('Thanh toán thất bại', result.message || 'Vui lòng thử lại hoặc chọn phương thức khác');
                return;
            }
            // Mark booking payment method first
            updateBooking(bookingId, {
                booking_code: bk.booking_code,
                user_id: bk.user_id,
                showtime_id: bk.showtime_id,
                status: bk.status, // still PENDING until finalizePaid updates to PAID
                total_amount: bk.total_amount,
                discount_amount: bk.discount_amount,
                final_amount: bk.final_amount,
                payment_method: paymentMethod,
                payment_reference: `EXT-${paymentMethod}-${Date.now()}`,
                hold_expires_at: bk.hold_expires_at,
                notes: bk.notes,
            });
            await finalizePaid();
        } catch (e) {
            console.error('External payment error', e);
            Alert.alert('Lỗi', e.message || 'Thanh toán không thành công');
            allowLeaveRef.current = false;
        } finally {
            setPayingExternal(false);
        }
    };

    const handleVnpResult = async (res) => {
        try {
            const bk = getBookingById(bookingId);
            if (!bk) throw new Error('Booking không tồn tại');
            if (!res?.success) {
                Alert.alert('Thanh toán thất bại', `Mã: ${res?.code || 'N/A'}`);
                return;
            }
            updateBooking(bookingId, {
                booking_code: bk.booking_code,
                user_id: bk.user_id,
                showtime_id: bk.showtime_id,
                status: bk.status,
                total_amount: bk.total_amount,
                discount_amount: bk.discount_amount,
                final_amount: bk.final_amount,
                payment_method: 'VNPAY',
                payment_reference: `${res?.txnRef || res?.orderId || bookingId}`,
                hold_expires_at: bk.hold_expires_at,
                notes: bk.notes,
            });
            await finalizePaid();
        } catch (e) {
            console.error('VNPay finalize error', e);
            Alert.alert('Lỗi', e.message || 'Không thể hoàn tất thanh toán');
        } finally {
            setShowVnpWebView(false);
            setPayingExternal(false);
        }
    };

    return (
        <View style={[commonStyles.container, styles.container]}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.heading}>Xác nhận đặt vé</Text>
                {movieTitle && <Text style={styles.movie}>{movieTitle}</Text>}
                {cinemaName && <Text style={styles.meta}>{cinemaName}</Text>}
                {startTime && <Text style={styles.meta}>{startTime}</Text>}
                <Text style={styles.meta}>Phòng: {roomId}</Text>
                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>Ghế đã chọn ({selectedSeatIds.length})</Text>
                {selectedSeatsDetailed.length === 0 && <Text style={styles.empty}>Không có ghế.</Text>}
                {breakdown.lines.map((l, idx) => (
                    <View key={idx} style={styles.lineRow}>
                        <Text style={styles.lineLabel}>{l.label}</Text>
                        <Text style={styles.linePrice}>{formatVND(l.price)}</Text>
                    </View>
                ))}
                <View style={styles.divider} />
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tạm tính</Text>
                    <Text style={styles.totalValue}>{formatVND(breakdown.total)}</Text>
                </View>
                <View style={styles.paymentMethods}>
                    <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
                    <View style={styles.methodRow}>
                        {['CASH', 'BANK'].map(m => (
                            <TouchableOpacity
                                key={m}
                                style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]}
                                onPress={() => setPaymentMethod(m)}
                                disabled={payingExternal || initializingHold || loading}
                            >
                                <Text style={[styles.methodText, paymentMethod === m && styles.methodTextActive]}>{m}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Giảm giá</Text>
                    <Text style={[styles.totalValue, { color: colors.success }]}>0đ</Text>
                </View>
                <View style={styles.totalRow}>
                    <Text style={styles.grandLabel}>Tổng thanh toán</Text>
                    <Text style={styles.grandValue}>{formatVND(breakdown.total)}</Text>
                </View>
                {error && <Text style={styles.error}>{error}</Text>}
            </ScrollView>
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.payBtn, { opacity: loading || initializingHold || payingExternal ? 0.7 : 1 }]}
                    disabled={loading || initializingHold || payingExternal}
                    onPress={onConfirm}
                >
                    {(loading || initializingHold || payingExternal) ? <ActivityIndicator color="#fff" /> : <Text style={styles.payText}>Thanh toán ({paymentMethod})</Text>}
                </TouchableOpacity>
            </View>
            <VnpayWebView
                visible={showVnpWebView}
                payUrl={vnpPayUrl}
                onResult={handleVnpResult}
                onCancel={() => { setShowVnpWebView(false); setPayingExternal(false); }}
            />
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
    paymentMethods: { marginTop: 12, marginBottom: 8 },
    methodRow: { flexDirection: 'row', alignItems: 'center' },
    methodBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
    methodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    methodText: { color: colors.textPrimary, fontWeight: '600' },
    methodTextActive: { color: '#fff' },
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

