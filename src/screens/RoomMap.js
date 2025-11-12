import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { colors, commonStyles } from "../styles/commonStyles";
import { Ionicons } from "@expo/vector-icons";
import { getSeatsByRoom } from "../database/seatDB";
import { getTicketsByShowtimeId } from "../database/ticketDB";

// Seat component (small square)
const Seat = ({ seat, reserved, selected, onPress }) => {
    let bg = colors.surface;
    let border = colors.border;
    let text = colors.textPrimary;
    let icon = null;

    if (reserved) {
        bg = colors.textTertiary;
        border = colors.textSecondary;
        text = colors.textSecondary;
        icon = "close";
    } else if (selected) {
        bg = colors.primary;
        border = colors.primary;
        text = "#FFFFFF";
        icon = "checkmark";
    } else if (seat.seat_type === "VIP") {
        bg = colors.accent;
        border = colors.accent;
        text = "#000000";
        icon = "star";
    } else if (seat.seat_type === "COUPLE") {
        bg = "rgba(211, 47, 47, 0.2)";
        border = colors.primary;
        icon = "heart";
    }

    return (
        <TouchableOpacity
            activeOpacity={reserved ? 1 : 0.8}
            onPress={reserved ? undefined : onPress}
            style={[
                styles.seat,
                {
                    backgroundColor: bg,
                    borderColor: border,
                    opacity: reserved ? 0.6 : 1,
                },
            ]}
        >
            {icon ? (
                <Ionicons name={icon} size={16} color={text} />
            ) : (
                <Text style={[styles.seatText, { color: text }]}>
                    {seat.row_label}{seat.seat_number}
                </Text>
            )}
        </TouchableOpacity>
    );
};

// Couple seat (double width)
const CoupleSeat = ({ seats, reserved, selected, onPress }) => {
    let bg = "rgba(211, 47, 47, 0.2)";
    let border = colors.primary;
    let text = colors.textPrimary;

    if (reserved) {
        bg = colors.textTertiary;
        border = colors.textSecondary;
        text = colors.textSecondary;
    } else if (selected) {
        bg = colors.primary;
        border = colors.primary;
        text = "#FFFFFF";
    }

    const label = `${seats[0].row_label}${seats[0].seat_number}-${seats[1].seat_number}`;

    return (
        <TouchableOpacity
            activeOpacity={reserved ? 1 : 0.8}
            onPress={reserved ? undefined : onPress}
            style={[
                styles.coupleSeat,
                {
                    backgroundColor: bg,
                    borderColor: border,
                    opacity: reserved ? 0.6 : 1,
                },
            ]}
        >
            <Ionicons name={selected ? "heart" : "heart-outline"} size={18} color={text} />
            <Text style={[styles.seatText, { color: text, marginLeft: 4 }]}>
                {label}
            </Text>
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
                        if (!t.hold_expires_at) return true;
                        const exp = new Date((t.hold_expires_at || '').replace(' ', 'T'));
                        return exp > now;
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
        Object.values(map).forEach(arr => arr.sort((a, b) => a.seat_number - b.seat_number));
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

        const byRow = seats.reduce((acc, s) => {
            acc[s.row_label] = acc[s.row_label] || [];
            acc[s.row_label].push(s);
            return acc;
        }, {});
        Object.values(byRow).forEach(arr => arr.sort((a, b) => a.seat_number - b.seat_number));

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
                        i = arr.indexOf(next);
                        continue;
                    }
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

    const validateSelection = (selSet) => {
        const totals = computeTotals(selSet);
        if (totals.totalSeats > 6) {
            return { ok: false, reason: 'Bạn chỉ được đặt tối đa 6 ghế mỗi lần.' };
        }

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

            if (n >= 2 && status[0] === 'FREE' && taken(status[1])) {
                return { ok: false, reason: 'Không được chừa trống 1 ghế ở đầu hàng.' };
            }
            if (n >= 2 && status[n - 1] === 'FREE' && taken(status[n - 2])) {
                return { ok: false, reason: 'Không được chừa trống 1 ghế ở cuối hàng.' };
            }
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
        if (next.has(seat.id)) next.delete(seat.id);
        else next.add(seat.id);

        const totals = computeTotals(next);
        if (totals.totalSeats > 6) {
            Alert.alert('Giới hạn', 'Bạn chỉ được chọn tối đa 6 ghế.');
            return;
        }

        const validation = validateSelection(next);
        if (!validation.ok) {
            Alert.alert('Không hợp lệ', validation.reason);
            return;
        }
        setSelectedSet(next);
    };

    return (
        <View style={[commonStyles.container, styles.container]}>
            {/* ==================== HEADER ==================== */}
            <View style={styles.headerContainer}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerSubtitle}>Chọn ghế</Text>
                    <Text style={styles.headerTitle} numberOfLines={1}>{movieTitle || "Phim"}</Text>
                </View>
                <View style={styles.seatCountBadge}>
                    <Ionicons name="seat" size={14} color={colors.accent} />
                    <Text style={styles.seatCountText}>{available}</Text>
                </View>
            </View>

            {/* ==================== INFO CARD ==================== */}
            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <Ionicons name="building" size={16} color={colors.accent} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.infoLabel}>Rạp</Text>
                        <Text style={styles.infoValue}>{cinemaName || "Rạp"}</Text>
                    </View>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                    <Ionicons name="time" size={16} color={colors.accent} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.infoLabel}>Giờ chiếu</Text>
                        <Text style={styles.infoValue}>{startTime || "N/A"}</Text>
                    </View>
                </View>
            </View>

            {/* ==================== SCREEN ==================== */}
            <View style={styles.screenBox}>
                <Text style={styles.screenLabel}>MÀN HÌNH</Text>
                <View style={styles.screenBar} />
            </View>

            {/* ==================== SEAT MAP ==================== */}
            <ScrollView
                contentContainerStyle={styles.mapContainer}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
            >
                {rows.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
                        <Text style={styles.emptyText}>Không có dữ liệu ghế cho phòng này.</Text>
                    </View>
                ) : (
                    rows.map(row => {
                        const units = [];
                        if (row.items.some(s => s.seat_type === 'COUPLE')) {
                            for (let i = 0; i < row.items.length; i++) {
                                const s = row.items[i];
                                if (s.seat_type === 'COUPLE' && s.seat_number % 2 === 1) {
                                    const next = row.items.find(x => x.seat_number === s.seat_number + 1);
                                    if (next && next.seat_type === 'COUPLE') {
                                        units.push({ type: 'COUPLE', seats: [s, next], key: `cp-${s.id}-${next.id}` });
                                        i = row.items.indexOf(next);
                                        continue;
                                    }
                                }
                                units.push({ type: 'SINGLE', seat: s, key: `s-${s.id}` });
                            }
                        } else {
                            row.items.forEach(s => units.push({ type: 'SINGLE', seat: s, key: `s-${s.id}` }));
                        }

                        return (
                            <View key={row.label} style={styles.row}>
                                <View style={styles.rowLabelContainer}>
                                    <Text style={styles.rowLabel}>{row.label}</Text>
                                </View>
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
                                                        const totals = computeTotals(next);
                                                        if (totals.totalSeats > 6) {
                                                            Alert.alert('Giới hạn', 'Bạn chỉ được chọn tối đa 6 ghế.');
                                                            return;
                                                        }
                                                        const validation = validateSelection(next);
                                                        if (!validation.ok) {
                                                            Alert.alert('Không hợp lệ', validation.reason);
                                                            return;
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

            {/* ==================== LEGEND ==================== */}
            <View style={styles.legendContainer}>
                <LegendItem icon="close" color={colors.textTertiary} label="Đã đặt" />
                <LegendItem icon="checkmark" color={colors.primary} label="Đã chọn" />
                <LegendItem color={colors.surface} borderColor={colors.border} label="Thường" />
                <LegendItem icon="star" color={colors.accent} label="VIP" />
                <LegendItem icon="heart-outline" color={colors.primary} label="Couple" />
            </View>

            {/* ==================== BOTTOM BAR ==================== */}
            <View style={styles.bottomBar}>
                <View style={styles.totalContainer}>
                    {(() => {
                        const t = computeTotals();
                        return (
                            <>
                                <View style={styles.totalItem}>
                                    <Text style={styles.totalLabel}>Ghế chọn</Text>
                                    <Text style={styles.totalValue}>{t.totalSeats}</Text>
                                </View>
                                <View style={styles.totalDivider} />
                                <View style={styles.totalItem}>
                                    <Text style={styles.totalLabel}>Tổng tiền</Text>
                                    <Text style={styles.totalPrice}>{formatVND(t.totalPrice)}</Text>
                                </View>
                            </>
                        );
                    })()}
                </View>

                <TouchableOpacity
                    style={[styles.continueBtn, { opacity: selectedSet.size ? 1 : 0.5 }]}
                    onPress={() => {
                        if (!selectedSet.size) return;
                        const validation = validateSelection(selectedSet);
                        if (!validation.ok) {
                            Alert.alert('Không hợp lệ', validation.reason);
                            return;
                        }
                        const t = computeTotals();
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
                    disabled={!selectedSet.size}
                    activeOpacity={0.85}
                >
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    <Text style={styles.continueText}>Thanh toán</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const LegendItem = ({ icon, color, borderColor, label }) => (
    <View style={styles.legendItem}>
        {icon ? (
            <View style={[styles.legendSwatch, { backgroundColor: color }]}>
                <Ionicons name={icon} size={12} color="#FFFFFF" />
            </View>
        ) : (
            <View style={[styles.legendSwatch, { backgroundColor: color, borderColor: borderColor || colors.border }]} />
        )}
        <Text numberOfLines={1} style={styles.legendLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        padding: 12,
    },

    // ==================== HEADER ====================
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
    },

    backButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },

    headerSubtitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 2,
    },

    headerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: 0.2,
    },

    seatCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },

    seatCountText: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.accent,
    },

    // ==================== INFO CARD ====================
    infoCard: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },

    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    infoDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 8,
    },

    infoLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.1,
    },

    infoValue: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 2,
    },

    // ==================== SCREEN ====================
    screenBox: {
        alignItems: 'center',
        paddingVertical: 16,
        marginBottom: 12,
    },

    screenLabel: {
        fontWeight: '800',
        color: colors.textSecondary,
        letterSpacing: 1,
        fontSize: 11,
        marginBottom: 8,
        textTransform: 'uppercase',
    },

    screenBar: {
        height: 8,
        width: '80%',
        backgroundColor: colors.primary,
        borderRadius: 8,
        opacity: 0.8,
        elevation: 3,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },

    // ==================== MAP CONTAINER ====================
    mapContainer: {
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
        minHeight: 200,
    },

    emptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyText: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 12,
        fontWeight: '600',
    },

    // ==================== SEAT ROWS ====================
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        width: '100%',
        gap: 8,
    },

    rowLabelContainer: {
        width: 30,
        alignItems: 'center',
    },

    rowLabel: {
        textAlign: 'center',
        color: colors.textPrimary,
        fontWeight: '800',
        fontSize: 12,
    },

    rowSeats: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },

    seat: {
        width: 36,
        height: 36,
        borderRadius: 8,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },

    coupleSeat: {
        width: 80,
        height: 36,
        borderRadius: 8,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        paddingHorizontal: 8,
        elevation: 2,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },

    seatText: {
        fontSize: 11,
        fontWeight: '700',
    },

    // ==================== LEGEND ====================
    legendContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 8,
        paddingVertical: 10,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },

    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minWidth: '30%',
    },

    legendSwatch: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    legendLabel: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '700',
        flex: 1,
    },

    // ==================== BOTTOM BAR ====================
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
    },

    totalContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },

    totalItem: {
        alignItems: 'center',
    },

    totalLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.1,
    },

    totalValue: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.textPrimary,
        marginTop: 2,
    },

    totalPrice: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.primary,
        marginTop: 2,
    },

    totalDivider: {
        width: 1,
        height: 24,
        backgroundColor: colors.border,
        marginHorizontal: 12,
    },

    continueBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        elevation: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },

    continueText: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 14,
        letterSpacing: 0.2,
    },
});
