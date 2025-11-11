import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { colors, commonStyles } from "../styles/commonStyles";
import { getSeatsByRoom } from "../database/seatDB";
import { getTicketsByShowtimeId } from "../database/ticketDB";

// Seat component (small square)
const Seat = ({ seat, reserved, selected, onPress }) => {
    let bg = colors.surface;
    let border = colors.border;
    let text = colors.textPrimary;

    if (reserved) {
        bg = "#E9ECEF"; // disabled gray
        text = "#98A2B3";
        border = "#D0D5DD";
    } else if (selected) {
        bg = "#F8E0EC"; // pastel pink
        border = "#F48FB1";
        text = colors.textPrimary;
    } else if (seat.seat_type === "VIP") {
        bg = "#FFF3E0"; // soft orange bg
        border = colors.accent;
    } else if (seat.seat_type === "COUPLE") {
        bg = "#EDE7F6"; // soft purple
        border = "#B39DDB";
    }

    return (
        <TouchableOpacity
            activeOpacity={reserved ? 1 : 0.8}
            onPress={reserved ? undefined : onPress}
            style={[styles.seat, { backgroundColor: bg, borderColor: border, opacity: reserved ? 0.7 : 1 }]}
        >
            <Text style={[styles.seatText, { color: text }]}>{seat.row_label}{seat.seat_number}</Text>
        </TouchableOpacity>
    );
};

// Couple seat (double width) representing two adjacent seats
const CoupleSeat = ({ seats, reserved, selected, onPress }) => {
    // seats is an array of two seat objects [left, right]
    let bg = "#EDE7F6";
    let border = "#B39DDB";
    let text = colors.textPrimary;
    if (reserved) {
        bg = "#E9ECEF"; border = "#D0D5DD"; text = "#98A2B3";
    } else if (selected) {
        bg = "#F8E0EC"; border = "#F48FB1";
    }
    const label = `${seats[0].row_label}${seats[0].seat_number}-${seats[1].seat_number}`;
    return (
        <TouchableOpacity
            activeOpacity={reserved ? 1 : 0.8}
            onPress={reserved ? undefined : onPress}
            style={[styles.coupleSeat, { backgroundColor: bg, borderColor: border, opacity: reserved ? 0.7 : 1 }]}
        >
            <Text style={[styles.seatText, { color: text }]}>{label}</Text>
        </TouchableOpacity>
    );
};

export default function RoomMap({ route, navigation }) {
    const { roomId, showtimeId, movieTitle, startTime, cinemaName, basePrice } = route.params || {};
    const [seats, setSeats] = useState([]);
    const [reservedSet, setReservedSet] = useState(new Set());
    const [selectedSet, setSelectedSet] = useState(new Set());

    useEffect(() => {
        try {
            const all = getSeatsByRoom(roomId) || [];
            setSeats(all);
        } catch (e) {
            setSeats([]);
        }
    }, [roomId]);

    useEffect(() => {
        if (!showtimeId) {
            setReservedSet(new Set());
            return;
        }
        try {
            const tickets = getTicketsByShowtimeId(showtimeId) || [];
            const now = new Date();
            const blocked = tickets
                .filter(t => {
                    if (t.status === 'PAID') return true;
                    if (t.status === 'HELD') {
                        if (!t.hold_expires_at) return true; // conservative
                        const exp = new Date((t.hold_expires_at || '').replace(' ', 'T'));
                        return exp > now; // only block if hold still valid
                    }
                    return false;
                })
                .map(t => t.seat_id);
            setReservedSet(new Set(blocked));
        } catch (e) {
            setReservedSet(new Set());
        }
    }, [showtimeId]);

    const rows = useMemo(() => {
        const map = {};
        seats.forEach(s => {
            if (!map[s.row_label]) map[s.row_label] = [];
            map[s.row_label].push(s);
        });
        // ensure stable ordering by seat_number
        Object.values(map).forEach(arr => arr.sort((a, b) => a.seat_number - b.seat_number));
        // order rows alphabetically A..Z
        return Object.keys(map).sort().map(label => ({ label, items: map[label] }));
    }, [seats]);

    const total = seats.length;
    const reserved = reservedSet.size;
    const available = Math.max(total - reserved, 0);

    const priceCfg = {
        STANDARD: 1.0,
        VIP: 1.2,
        COUPLE: 1.5,
        ACCESSIBLE: 1.0,
    };

    const effectiveBase = typeof basePrice === 'number' ? basePrice : 120000;

    const formatVND = (n) => (n || 0).toLocaleString('vi-VN') + 'đ';

    const computeTotals = (selectedOverride) => {
        let totalSeats = 0;
        let totalPrice = 0;
        const selSet = selectedOverride || selectedSet;

        // Build rows for couple pairing logic
        const byRow = seats.reduce((acc, s) => {
            acc[s.row_label] = acc[s.row_label] || [];
            acc[s.row_label].push(s);
            return acc;
        }, {});
        Object.values(byRow).forEach(arr => arr.sort((a, b) => a.seat_number - b.seat_number));

        // Iterate each row
        for (const label of Object.keys(byRow)) {
            const arr = byRow[label];
            for (let i = 0; i < arr.length; i++) {
                const s = arr[i];
                if (s.seat_type === 'COUPLE' && s.seat_number % 2 === 1) {
                    const next = arr.find(x => x.seat_number === s.seat_number + 1);
                    const bothSelected = next && selSet.has(s.id) && selSet.has(next.id);
                    if (bothSelected) {
                        totalSeats += 2;
                        totalPrice += effectiveBase * 2 * (priceCfg.COUPLE || 1);
                        i = arr.indexOf(next); // skip next
                        continue;
                    }
                    // If not both selected, ignore partial (shouldn't occur with current UI)
                }
                if (selSet.has(s.id)) {
                    totalSeats += 1;
                    const mult = priceCfg[s.seat_type] || 1.0;
                    totalPrice += effectiveBase * mult;
                }
            }
        }
        return { totalSeats, totalPrice };
    };

    // Validate selection rules:
    // - No single empty seat between two taken seats (taken = reserved or selected)
    // - No single empty seat left at either row edge next to a taken seat
    // - Max 6 seats can be selected per booking
    const validateSelection = (selSet) => {
        // Max seats
        const totals = computeTotals(selSet);
        if (totals.totalSeats > 6) {
            return { ok: false, reason: 'Bạn chỉ được đặt tối đa 6 ghế mỗi lần.' };
        }

        // Build status per row
        const byRow = seats.reduce((acc, s) => {
            acc[s.row_label] = acc[s.row_label] || [];
            acc[s.row_label].push(s);
            return acc;
        }, {});
        for (const label of Object.keys(byRow)) {
            const arr = byRow[label].slice().sort((a, b) => a.seat_number - b.seat_number);
            const status = arr.map(s => {
                if (s.is_active === 0) return 'RES';
                if (reservedSet.has(s.id)) return 'RES';
                if (selSet.has(s.id)) return 'SEL';
                return 'FREE';
            });
            const n = status.length;
            const taken = (v) => v === 'RES' || v === 'SEL';

            // Left edge: cannot leave exactly one FREE at the start followed by taken
            if (n >= 2 && status[0] === 'FREE' && taken(status[1])) {
                return { ok: false, reason: 'Không được chừa trống 1 ghế ở đầu hàng.' };
            }
            // Right edge
            if (n >= 2 && status[n - 1] === 'FREE' && taken(status[n - 2])) {
                return { ok: false, reason: 'Không được chừa trống 1 ghế ở cuối hàng.' };
            }
            // Middle single gaps
            for (let i = 1; i < n - 1; i++) {
                if (status[i] === 'FREE' && taken(status[i - 1]) && taken(status[i + 1])) {
                    return { ok: false, reason: 'Không được để trống 1 ghế giữa 2 ghế đã chọn/đã đặt.' };
                }
            }
        }
        return { ok: true };
    };

    const toggleSeat = (seat) => {
        if (reservedSet.has(seat.id)) return;
        const next = new Set(selectedSet);
        if (next.has(seat.id)) next.delete(seat.id); else next.add(seat.id);
        // Only enforce max seats here
        const totals = computeTotals(next);
        if (totals.totalSeats > 6) {
            Alert.alert('Giới hạn', 'Bạn chỉ được chọn tối đa 6 ghế.');
            return;
        }
        setSelectedSet(next);
    };

    return (
        <View style={[commonStyles.container, styles.container]}>
            <View style={styles.headerInfo}>
                <Text style={styles.title}>{cinemaName || "Rạp"}</Text>
                {!!movieTitle && <Text style={styles.subTitle}>{movieTitle}</Text>}
                {!!startTime && <Text style={styles.subMeta}>{startTime}</Text>}
                <Text style={styles.subMeta}>Phòng: {roomId} • Ghế trống {available}/{total}</Text>
            </View>

            <View style={styles.screenBox}>
                <View style={styles.screenBar} />
                <Text style={styles.screenText}>MÀN HÌNH</Text>
            </View>

            <ScrollView contentContainerStyle={styles.mapContainer}>
                {rows.length === 0 ? (
                    <View style={styles.empty}><Text style={{ color: colors.textSecondary }}>Không có dữ liệu ghế cho phòng này.</Text></View>
                ) : (
                    rows.map(row => {
                        // Prepare display units: couple pairs on row G -> (1,2) and (3,4) only
                        const units = [];
                        if (row.items.some(s => s.seat_type === 'COUPLE')) {
                            for (let i = 0; i < row.items.length; i++) {
                                const s = row.items[i];
                                // Pair any odd-even couple (1-2, 3-4, 5-6, ...)
                                if (s.seat_type === 'COUPLE' && s.seat_number % 2 === 1) {
                                    const next = row.items.find(x => x.seat_number === s.seat_number + 1);
                                    if (next && next.seat_type === 'COUPLE') {
                                        units.push({ type: 'COUPLE', seats: [s, next], key: `cp-${s.id}-${next.id}` });
                                        i = row.items.indexOf(next); // skip next in loop
                                        continue;
                                    }
                                }
                                // fallback single
                                units.push({ type: 'SINGLE', seat: s, key: `s-${s.id}` });
                            }
                        } else {
                            // Non-couple rows
                            row.items.forEach(s => units.push({ type: 'SINGLE', seat: s, key: `s-${s.id}` }));
                        }

                        return (
                            <View key={row.label} style={styles.row}>
                                <Text style={styles.rowLabel}>{row.label}</Text>
                                <View style={styles.rowSeats}>
                                    {units.map(u => {
                                        if (u.type === 'COUPLE') {
                                            const res = u.seats.some(x => reservedSet.has(x.id) || x.is_active === 0);
                                            const sel = u.seats.every(x => selectedSet.has(x.id));
                                            return (
                                                <CoupleSeat
                                                    key={u.key}
                                                    seats={u.seats}
                                                    reserved={res}
                                                    selected={sel}
                                                    onPress={() => {
                                                        if (res) return;
                                                        const next = new Set(selectedSet);
                                                        if (sel) {
                                                            u.seats.forEach(x => next.delete(x.id));
                                                        } else {
                                                            u.seats.forEach(x => next.add(x.id));
                                                        }
                                                        setSelectedSet(next);
                                                    }}
                                                />
                                            );
                                        }
                                        const seat = u.seat;
                                        return (
                                            <Seat
                                                key={u.key}
                                                seat={seat}
                                                reserved={reservedSet.has(seat.id) || seat.is_active === 0}
                                                selected={selectedSet.has(seat.id)}
                                                onPress={() => toggleSeat(seat)}
                                            />
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <View style={styles.legend}>
                <LegendItem color="#E9ECEF" label="Đã đặt/giữ" />
                <LegendItem color="#F8E0EC" borderColor="#F48FB1" label="Ghế bạn chọn" />
                <LegendItem color="#FFFFFF" borderColor={colors.border} label="Ghế thường" />
                <LegendItem color="#FFF3E0" borderColor={colors.accent} label="Ghế VIP" />
                <LegendItem color="#EDE7F6" borderColor="#B39DDB" label="Ghế COUPLE" />
            </View>

            <View style={styles.bottomBar}>
                {(() => {
                    const t = computeTotals(); return (
                        <Text style={styles.bottomText}>Đang chọn: {t.totalSeats} • Tổng: {formatVND(t.totalPrice)}</Text>
                    );
                })()}
                <TouchableOpacity
                    style={[styles.continueBtn, { opacity: selectedSet.size ? 1 : 0.6 }]}
                    onPress={() => {
                        if (!selectedSet.size) return;
                        const validation = validateSelection(selectedSet);
                        if (!validation.ok) {
                            Alert.alert('Không hợp lệ', validation.reason);
                            return;
                        }
                        const t = computeTotals();
                        // Điều hướng sang màn Checkout kèm dữ liệu cần thiết
                        navigation.navigate('Checkout', {
                            showtimeId,
                            roomId,
                            movieTitle,
                            cinemaName,
                            startTime,
                            basePrice: effectiveBase,
                            selectedSeatIds: Array.from(selectedSet),
                            summary: { totalSeats: t.totalSeats, totalPrice: t.totalPrice },
                        });
                    }}
                >
                    <Text style={styles.continueText}>Tiếp tục</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const LegendItem = ({ color, borderColor, label }) => (
    <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { backgroundColor: color, borderColor: borderColor || colors.border }]} />
        <Text numberOfLines={2} style={styles.legendLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { padding: 12 },
    headerInfo: { marginBottom: 8 },
    title: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
    subTitle: { color: colors.textSecondary, marginTop: 2 },
    subMeta: { color: colors.textSecondary, marginTop: 2, fontSize: 12 },

    screenBox: { alignItems: "center", marginTop: 6, marginBottom: 12 },
    screenBar: { height: 6, marginTop: 40, width: "85%", backgroundColor: colors.primary, borderRadius: 6, opacity: 0.7 },
    screenText: { marginTop: 6, fontWeight: "700", color: colors.textSecondary, letterSpacing: 2 },

    mapContainer: { padding: 8, alignItems: 'center', marginTop: 16 },
    empty: { padding: 24, alignItems: "center" },
    row: { flexDirection: "row", alignItems: "center", justifyContent: 'center', marginBottom: 10, width: '100%' },
    rowLabel: { width: 24, textAlign: "center", color: colors.textPrimary, fontWeight: "700" },
    rowSeats: { flexDirection: "row", flexWrap: "nowrap", justifyContent: 'center', alignItems: 'center' },
    seat: {
        width: 34,
        height: 34,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 6,
        marginBottom: 8,
    },
    coupleSeat: {
        width: 74, // 2 * 34 + 6 spacing
        height: 34,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 6,
        marginBottom: 8,
    },
    seatText: { fontSize: 11, fontWeight: "700" },

    legend: { flexDirection: "row", flexWrap: 'wrap', alignItems: "center", justifyContent: 'center', gap: 12, paddingHorizontal: 8, marginBottom: 8 },
    legendItem: { flexDirection: "row", alignItems: "center", marginHorizontal: 6, marginBottom: 6, maxWidth: '45%' },
    legendSwatch: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, marginRight: 6 },
    legendLabel: { color: colors.textSecondary, fontSize: 12, flexShrink: 1, flexWrap: 'wrap' },

    bottomBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
    bottomText: { color: colors.textPrimary, fontWeight: "600" },
    continueBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
    continueText: { color: "#fff", fontWeight: "700" },
});

