import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import { colors, commonStyles } from "../styles/commonStyles";
import { Ionicons } from "@expo/vector-icons";
import { getAllCinemas, getCinemaById } from "../database/db";
import { getAllShowtimes, getShowtimesByMovieId, getShowtimesByRoomId, ensureShowtimesSeeded } from "../database/showtimeDB";
import { getRoomById } from "../database/roomDB";
import { getSeatsByRoom } from "../database/seatDB";
import { getTicketsByShowtimeId } from "../database/ticketDB";

const formatIso = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

const build7Days = () => {
    const days = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        days.push({
            dateObj: d,
            iso: formatIso(d),
            label: d.toLocaleDateString(undefined, { weekday: "short" }),
            day: d.getDate(),
        });
    }
    return days;
};

export default function ShowtimeScreen({ route, navigation }) {
    const { movieId, movieTitle } = route.params || {};
    const [days] = useState(build7Days());
    const [selectedIso, setSelectedIso] = useState(days[0].iso);
    const [cinemas, setCinemas] = useState([]);
    const [showtimes, setShowtimes] = useState([]);
    const [loading, setLoading] = useState(false);
    const roomSeatCountCache = {};

    useEffect(() => {
        try {
            const c = getAllCinemas();
            setCinemas(c);
        } catch (err) {
            setCinemas([]);
        }
    }, [movieId]);

    useEffect(() => {
        if (!movieId) {
            setShowtimes([]);
            return;
        }

        setLoading(true);
        try {
            ensureShowtimesSeeded();
            const raw = getShowtimesByMovieId(movieId);
            const allCinemas = cinemas && cinemas.length ? cinemas : getAllCinemas();

            const enriched = raw.map((st) => {
                const startParts = (st.start_time || '').split(' ');
                const endParts = (st.end_time || '').split(' ');
                const show_date = startParts[0] || '';
                const show_time = (startParts[1] || '').slice(0, 5);
                const show_end_time = (endParts[1] || '').slice(0, 5);

                let cinemaName = 'Unknown Cinema';
                let cinemaAddress = '';
                let cinemaId = null;
                try {
                    const room = getRoomById(st.room_id);
                    if (room && room.cinema_id) {
                        cinemaId = room.cinema_id;
                        const cm = allCinemas.find((x) => x.id === cinemaId) || getCinemaById(cinemaId);
                        if (cm) {
                            cinemaName = cm.name || cinemaName;
                            cinemaAddress = cm.address || '';
                        }
                    }
                } catch (e) { }

                let totalSeats = 0;
                try {
                    if (!roomSeatCountCache[st.room_id]) {
                        roomSeatCountCache[st.room_id] = getSeatsByRoom(st.room_id).length;
                    }
                    totalSeats = roomSeatCountCache[st.room_id] || 0;
                } catch (e) { totalSeats = 0; }

                let reservedSeats = 0;
                try {
                    const tickets = getTicketsByShowtimeId(st.id) || [];
                    reservedSeats = tickets.filter(t => ['PAID', 'HELD'].includes(t.status)).length;
                } catch (e) { reservedSeats = 0; }

                const availableSeats = Math.max(totalSeats - reservedSeats, 0);
                const seat_available_text = `${availableSeats}/${totalSeats}`;

                return {
                    ...st,
                    show_date,
                    show_time,
                    show_end_time,
                    cinema_id: cinemaId,
                    cinema_name: cinemaName,
                    cinema_address: cinemaAddress,
                    total_seats: totalSeats,
                    reserved_seats: reservedSeats,
                    available_seats: availableSeats,
                    seat_available_text,
                };
            });

            setShowtimes(enriched);
        } catch (error) {
            console.error('❌ Error loading showtimes for movie', movieId, error);
            setShowtimes([]);
        } finally {
            setLoading(false);
        }
    }, [movieId, cinemas]);

    const groupedByCinemaForDate = (isoDate) => {
        const filtered = showtimes.filter((st) => st.show_date === isoDate);
        const map = {};
        filtered.forEach((st) => {
            const cid = st.cinema_id || st.cinemaId || st.cinema_id;
            if (!map[cid]) map[cid] = { cinema: st.cinema_name || st.name || "Cinema", showtimes: [] };
            map[cid].showtimes.push(st);
        });
        return map;
    };

    const getSeatStatusColor = (available, total) => {
        if (total === 0) return { bg: colors.error, text: '#FFFFFF', label: 'Hết vé' };
        const ratio = available / total;
        if (ratio === 0) return { bg: colors.error, text: '#FFFFFF', label: 'Hết vé' };
        if (ratio <= 0.2) return { bg: colors.error, text: '#FFFFFF', label: 'Sắp hết' };
        if (ratio <= 0.4) return { bg: colors.warning, text: '#000000', label: 'Còn ít' };
        if (ratio <= 0.7) return { bg: colors.accent, text: '#000000', label: 'Còn' };
        return { bg: colors.success, text: '#FFFFFF', label: 'Còn nhiều' };
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
                    <Text style={styles.headerSubtitle}>Chọn suất chiếu</Text>
                    <Text style={styles.headerTitle} numberOfLines={1}>{movieTitle || "Showtimes"}</Text>
                </View>
            </View>

            {/* ==================== DATE INFO ==================== */}
            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <Ionicons name="calendar" size={16} color={colors.accent} />
                    <Text style={styles.infoText}>Ngày chiếu: <Text style={{ fontWeight: '700', color: colors.accent }}>{selectedIso}</Text></Text>
                </View>
            </View>

            {/* ==================== 7-DAY DATE PICKER ==================== */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.daysRow}
                contentContainerStyle={styles.daysRowContent}
                scrollEventThrottle={16}
            >
                {days.map((d, idx) => (
                    <TouchableOpacity
                        key={d.iso}
                        style={[
                            styles.dayItem,
                            selectedIso === d.iso && styles.dayItemActive,
                            idx === days.length - 1 && { marginRight: 8 }
                        ]}
                        onPress={() => setSelectedIso(d.iso)}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.dayLabel,
                            selectedIso === d.iso && styles.dayLabelActive
                        ]}>
                            {d.label}
                        </Text>
                        <View style={[
                            styles.dayBubble,
                            selectedIso === d.iso && styles.dayBubbleActive
                        ]}>
                            <Text style={[
                                styles.dayNumber,
                                selectedIso === d.iso && styles.dayNumberActive
                            ]}>
                                {d.day}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* ==================== SHOWTIMES LIST ==================== */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Đang tải suất chiếu...</Text>
                </View>
            ) : (
                <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                    {(() => {
                        const grouped = groupedByCinemaForDate(selectedIso);
                        const cinemaIds = Object.keys(grouped);

                        if (cinemaIds.length === 0) {
                            return (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="film-outline" size={56} color={colors.textSecondary} />
                                    <Text style={styles.emptyTitle}>Không có suất chiếu</Text>
                                    <Text style={styles.emptyText}>Vui lòng chọn ngày khác</Text>
                                </View>
                            );
                        }

                        return cinemaIds.map((cid) => {
                            const group = grouped[cid];
                            return (
                                <View key={cid} style={styles.cinemaCard}>
                                    {/* Cinema Header */}
                                    <View style={styles.cinemaHeader}>
                                        <View style={styles.cinemaIconContainer}>
                                            <Ionicons name="building" size={24} color={colors.accent} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cinemaName}>{group.cinema}</Text>
                                            {group.showtimes[0]?.cinema_address ? (
                                                <View style={styles.cinemaAddressRow}>
                                                    <Ionicons name="location-sharp" size={12} color={colors.textSecondary} />
                                                    <Text style={styles.cinemaAddress}>{group.showtimes[0].cinema_address}</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    </View>

                                    {/* Showtimes Row (horizontal to avoid excessive vertical growth) */}
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.timesRowContent}
                                    >
                                        {group.showtimes.map((st) => {
                                            const seatStatus = getSeatStatusColor(st.available_seats, st.total_seats);
                                            const isFull = st.available_seats === 0;

                                            return (
                                                <TouchableOpacity
                                                    key={st.id}
                                                    style={[
                                                        styles.timeButton,
                                                        isFull && styles.timeButtonDisabled
                                                    ]}
                                                    activeOpacity={isFull ? 1 : 0.85}
                                                    onPress={() => {
                                                        if (!isFull) {
                                                            try {
                                                                navigation.navigate('RoomMap', {
                                                                    showtimeId: st.id,
                                                                    roomId: st.room_id,
                                                                    movieId: st.movie_id,
                                                                    movieTitle,
                                                                    startTime: st.start_time,
                                                                    endTime: st.end_time,
                                                                    basePrice: st.base_price,
                                                                    cinemaName: st.cinema_name,
                                                                });
                                                            } catch (e) {
                                                                console.log('Navigation to RoomMap failed:', e);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    {/* Time */}
                                                    <View style={styles.timeContent}>
                                                        <Ionicons name="time" size={18} color={colors.primary} />
                                                        <Text style={styles.timeText}>
                                                            {st.show_time}
                                                        </Text>
                                                    </View>

                                                    {/* Duration */}
                                                    <Text style={styles.durationText}>
                                                        ~{Math.round((new Date(`2024-01-01 ${st.show_end_time}`) - new Date(`2024-01-01 ${st.show_time}`)) / 60000)} phút
                                                    </Text>

                                                    {/* Seat Badge */}
                                                    <View style={[
                                                        styles.seatBadge,
                                                        { backgroundColor: seatStatus.bg }
                                                    ]}>
                                                        <Ionicons
                                                            name={st.available_seats > 0 ? "checkmark-circle" : "close-circle"}
                                                            size={12}
                                                            color={seatStatus.text}
                                                            style={{ marginRight: 4 }}
                                                        />
                                                        <Text style={[
                                                            styles.seatBadgeText,
                                                            { color: seatStatus.text }
                                                        ]}>
                                                            {st.available_seats}/{st.total_seats}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            );
                        });
                    })()}

                    <View style={{ height: 20 }} />
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 12,
    },

    // ==================== HEADER ====================
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        marginBottom: 10,
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
        fontWeight: '600',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.2,
        marginBottom: 4,
    },

    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: 0.3,
    },

    // ==================== INFO CARD ====================
    infoCard: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },

    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    infoText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },

    // ==================== DAYS ROW ====================
    daysRow: {
        marginBottom: 8,
    },

    daysRowContent: {
        paddingHorizontal: 8,
        gap: 8,
    },

    dayItem: {
        alignItems: 'center',
        paddingHorizontal: 6,
    },

    dayLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.1,
    },

    dayLabelActive: {
        color: colors.primary,
    },

    dayBubble: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
    },

    dayBubbleActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        elevation: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },

    dayNumber: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.textPrimary,
    },

    dayNumberActive: {
        color: '#FFFFFF',
    },

    dayItemActive: {},

    // ==================== LIST ====================
    list: {
        marginTop: 4,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    loadingText: {
        fontSize: 14,
        color: colors.textPrimary,
        marginTop: 12,
        fontWeight: '600',
    },

    // ==================== CINEMA CARD ====================
    cinemaCard: {
        backgroundColor: colors.surface,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        marginBottom: 10,
        alignSelf: 'center',
        width: '96%',
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 3,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
    },

    cinemaHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 10,
    },

    cinemaIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: colors.backgroundAlt,
        justifyContent: 'center',
        alignItems: 'center',
    },

    cinemaName: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 4,
        letterSpacing: 0.2,
    },

    cinemaAddressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },

    cinemaAddress: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '600',
        flex: 1,
    },

    // ==================== TIMES ROW (Horizontal) ====================
    timesRowContent: {
        paddingHorizontal: 2,
        paddingBottom: 4,
        gap: 8,
    },

    timeButton: {
        width: 128,
        backgroundColor: colors.backgroundAlt,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.primary,
        elevation: 2,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },

    timeButtonDisabled: {
        opacity: 0.5,
        borderColor: colors.error,
    },

    timeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },

    timeText: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: 0.2,
    },

    durationText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '600',
        marginBottom: 6,
    },

    seatBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 8,
    },

    seatBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.1,
    },

    // ==================== EMPTY STATE ====================
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.textPrimary,
        marginTop: 16,
        marginBottom: 8,
        letterSpacing: 0.3,
    },

    emptyText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '600',
    },
});

