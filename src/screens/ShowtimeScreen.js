import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    FlatList,
} from "react-native";
import { colors, commonStyles } from "../styles/commonStyles";
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
    // Cache để tránh query lặp lại
    const roomSeatCountCache = {};

    useEffect(() => {
        // Load cinemas and showtimes for this movie
        console.log('Route params:', route.params);
        console.log('movieId used:', movieId);
        try {
            const c = getAllCinemas();
            setCinemas(c);
        } catch (err) {
            setCinemas([]);
        }
    }, [movieId]);

    useEffect(() => {
        // Load showtimes for the provided movieId and enrich with cinema/room info
        if (!movieId) {
            setShowtimes([]);
            return;
        }

        try {
            // Đảm bảo bảng showtimes đã được seed (idempotent)
            ensureShowtimesSeeded();
            const raw = getShowtimesByMovieId(movieId);
            // console.log('Fetched showtimes for movieId', movieId, raw);
            // Use the currently loaded cinemas (or fetch them if empty)
            const allCinemas = cinemas && cinemas.length ? cinemas : getAllCinemas();

            const enriched = raw.map((st) => {
                // Parse start & end
                const startParts = (st.start_time || '').split(' ');
                const endParts = (st.end_time || '').split(' ');
                const show_date = startParts[0] || '';
                const show_time = (startParts[1] || '').slice(0, 5);
                const show_end_time = (endParts[1] || '').slice(0, 5);

                // Cinema info
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
                } catch (e) {
                    // ignore
                }

                // Seats total (room-level)
                let totalSeats = 0;
                try {
                    if (!roomSeatCountCache[st.room_id]) {
                        roomSeatCountCache[st.room_id] = getSeatsByRoom(st.room_id).length;
                    }
                    totalSeats = roomSeatCountCache[st.room_id] || 0;
                } catch (e) { totalSeats = 0; }

                // Reserved seats (tickets with status PAID or HELD for this showtime)
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

    return (
        <View style={[commonStyles.container, styles.container]}>
            <Text style={styles.headerTitle}>{movieTitle || "Showtimes"}</Text>

            {/* Extra info: movie id + selected date */}
            <View style={styles.infoRow}>
                <Text style={styles.infoText}>Movie ID: {movieId ?? 'N/A'}</Text>
                <Text style={styles.infoDivider}>•</Text>
                <Text style={styles.infoText}>Date: {selectedIso}</Text>
            </View>

            {/* 7-day horizontal picker */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysRow} contentContainerStyle={{ paddingHorizontal: 8 }}>
                {days.map((d) => (
                    <TouchableOpacity
                        key={d.iso}
                        style={[styles.dayItem, selectedIso === d.iso ? styles.dayItemActive : null]}
                        onPress={() => setSelectedIso(d.iso)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.dayLabel, selectedIso === d.iso ? styles.dayLabelActive : null]}>{d.label}</Text>
                        <View style={[styles.dayBubble, selectedIso === d.iso ? styles.dayBubbleActive : null]}>
                            <Text style={[styles.dayNumber, selectedIso === d.iso ? styles.dayNumberActive : null]}>{d.day}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Showtimes grouped by cinema */}
            <ScrollView style={styles.list}>
                {(() => {
                    const grouped = groupedByCinemaForDate(selectedIso);
                    const cinemaIds = Object.keys(grouped);
                    if (cinemaIds.length === 0) {
                        return (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No showtimes for this movie on this date.</Text>
                            </View>
                        );
                    }

                    return cinemaIds.map((cid) => {
                        const group = grouped[cid];
                        return (
                            <View key={cid} style={styles.cinemaCard}>
                                <View style={styles.cinemaHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cinemaName}>{group.cinema}</Text>
                                        {group.showtimes[0]?.cinema_address ? (
                                            <Text style={styles.cinemaAddress}>{group.showtimes[0].cinema_address}</Text>
                                        ) : null}
                                    </View>
                                </View>
                                <View style={styles.timesRow}>
                                    {group.showtimes.map((st) => {
                                        const ratio = st.total_seats ? st.available_seats / st.total_seats : 0;
                                        let badgeBg = colors.success;
                                        let badgeText = '#fff';
                                        if (ratio === 0) { badgeBg = colors.error; badgeText = '#fff'; }
                                        else if (ratio <= 0.3) { badgeBg = colors.accent; badgeText = '#fff'; }
                                        else if (ratio <= 0.6) { badgeBg = colors.warning; badgeText = colors.textPrimary; }

                                        return (
                                            <TouchableOpacity
                                                key={st.id}
                                                style={styles.timeButton}
                                                activeOpacity={0.9}
                                                onPress={() => {
                                                    // Navigate to seat map for this showtime/room
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
                                                }}
                                            >
                                                <View style={styles.timeHeaderRow}>
                                                    <Text style={styles.timeText}>{st.show_time} - {st.show_end_time}</Text>
                                                    <View style={[styles.seatBadge, { backgroundColor: badgeBg }]}>
                                                        <Text style={[styles.seatBadgeText, { color: badgeText }]}>
                                                            {st.available_seats}/{st.total_seats}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.timeSubText}>Ghế trống</Text>
                                                {/* <Text style={styles.timeMetaText}>{st.show_date}</Text> */}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    });
                })()}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 12 },
    headerTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12, color: colors.textPrimary },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    infoText: { color: colors.textSecondary, fontSize: 12 },
    infoDivider: { marginHorizontal: 8, color: colors.textSecondary },
    daysRow: { marginBottom: 12 },
    dayItem: { alignItems: "center", marginHorizontal: 8 },
    dayLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
    dayLabelActive: { color: colors.primary, fontWeight: "600" },
    dayBubble: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border },
    dayBubbleActive: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
    dayNumber: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
    dayNumberActive: { color: "#fff" },
    dayItemActive: {},
    list: { marginTop: 8 },
    cinemaCard: { backgroundColor: colors.surface, padding: 14, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: colors.border, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
    cinemaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    cinemaName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
    cinemaAddress: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    timesRow: { flexDirection: "row", flexWrap: "wrap" },
    timeButton: { backgroundColor: colors.primaryLight, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginRight: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.border, shadowColor: colors.primary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1, minWidth: 140 },
    timeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    timeText: { color: colors.textPrimary, fontWeight: "700", fontSize: 14 },
    timeSubText: { color: colors.textSecondary, fontSize: 11 },
    timeMetaText: { color: colors.textSecondary, fontSize: 10 },
    seatBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 12, marginLeft: 8 },
    seatBadgeText: { fontSize: 11, fontWeight: '700' },
    emptyContainer: { padding: 24, alignItems: "center" },
    emptyText: { color: colors.textSecondary },
});
