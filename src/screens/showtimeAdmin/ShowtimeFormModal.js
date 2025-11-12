// src/screens/showtimeAdmin/ShowtimeFormModal.js
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import { colors, commonStyles } from '../../styles/commonStyles';
import { getAllMovies } from '../../database/db';
import { getRoomsByCinemaId } from '../../database/roomDB';
import { createShowtimeWithValidation, updateShowtimeWithValidation, calculateEndTimeForShow } from '../../database/showtimeDB';

const StatusOptions = ['SCHEDULED', 'CANCELLED', 'FINISHED'];

const errorMessages = {
    MISSING_FIELDS: 'Vui lòng nhập đầy đủ thông tin.',
    INVALID_PRICE: 'Giá vé không hợp lệ.',
    INVALID_MOVIE_OR_START_TIME: 'Phim hoặc thời gian bắt đầu không hợp lệ.',
    ROOM_NOT_FOUND: 'Không tìm thấy phòng.',
    ROOM_INACTIVE: 'Phòng này đã bị vô hiệu.',
    ROOM_NOT_IN_CINEMA: 'Phòng không thuộc rạp đã chọn.',
    DUPLICATE_SHOWTIME: 'Suất chiếu trùng nhau (cùng phim/phòng/giờ bắt đầu).',
    CONFLICT_30_MIN: 'Suất chiếu xung đột (phải cách nhau tối thiểu 30 phút).',
    INTERNAL: 'Lỗi nội bộ. Vui lòng thử lại.',
    PAST_START_TIME: 'Không thể tạo hoặc chỉnh sửa suất chiếu trong quá khứ.',
};

export default function ShowtimeFormModal({
    visible,
    onClose,
    mode = 'create', // 'create' | 'edit'
    initial,
    cinemaId,
    dateStr,
    onSaved,
    lockedDateTime = false, // true: cannot change date/time/movie/room if tickets purchased
}) {
    const [movies, setMovies] = useState([]);
    const [rooms, setRooms] = useState([]);

    const [movieId, setMovieId] = useState(initial?.movie_id || null);
    const [roomId, setRoomId] = useState(initial?.room_id || null);
    const [timeHHmm, setTimeHHmm] = useState(() => {
        if (initial?.start_time) {
            const t = String(initial.start_time).split(' ')[1]?.slice(0, 5);
            return t || '18:00';
        }
        return '18:00';
    });
    const [basePrice, setBasePrice] = useState(String(initial?.base_price ?? '90000'));
    const [status, setStatus] = useState(initial?.status || 'SCHEDULED');
    const [searchMovie, setSearchMovie] = useState('');

    // Helper: reset form to defaults for create mode
    const resetForm = () => {
        setMovieId(null);
        setRoomId(null);
        setTimeHHmm('18:00');
        setBasePrice('90000');
        setStatus('SCHEDULED');
        setSearchMovie('');
    };

    useEffect(() => {
        try {
            const mv = getAllMovies();
            setMovies(mv);
        } catch (e) { }
    }, [visible]);

    useEffect(() => {
        if (!cinemaId) { setRooms([]); return; }
        try {
            const rs = getRoomsByCinemaId(cinemaId) || [];
            setRooms(rs);
        } catch (e) { }
    }, [cinemaId, visible]);

    useEffect(() => {
        if (initial) {
            setMovieId(initial.movie_id);
            setRoomId(initial.room_id);
            const t = String(initial.start_time).split(' ')[1]?.slice(0, 5) || '18:00';
            setTimeHHmm(t);
            setBasePrice(String(initial.base_price));
            setStatus(initial.status || 'SCHEDULED');
        } else {
            // Defaults when switching from edit->create
            resetForm();
        }
    }, [initial]);

    // When modal is opened in create mode, ensure the form is clean
    useEffect(() => {
        if (visible && mode === 'create' && !initial) {
            resetForm();
        }
    }, [visible, mode]);

    const filteredMovies = useMemo(() => {
        const key = searchMovie.trim().toLowerCase();
        if (!key) return movies;
        return movies.filter(m => (m.title || '').toLowerCase().includes(key));
    }, [movies, searchMovie]);

    const [overrideDateStr, setOverrideDateStr] = useState(() => dateStr || String(initial?.start_time).split(' ')[0]);

    useEffect(() => {
        if (mode === 'create') {
            setOverrideDateStr(dateStr);
        }
    }, [dateStr, mode]);

    const buildStartTime = () => {
        const safeDate = overrideDateStr || dateStr || String(initial?.start_time).split(' ')[0];
        const [hh, mm] = (timeHHmm || '').split(':');
        const HH = (parseInt(hh, 10) || 0).toString().padStart(2, '0');
        const MM = (parseInt(mm, 10) || 0).toString().padStart(2, '0');
        return `${safeDate} ${HH}:${MM}:00`;
    };

    const handleSave = () => {
        if (!movieId || !roomId || !basePrice) {
            Alert.alert('Thiếu thông tin', errorMessages.MISSING_FIELDS);
            return;
        }
        if (mode === 'edit' && lockedDateTime) {
            // For locked showtimes we prevent changes to start time fields by recomputing from original date/time (movie & room also locked)
            // Ensure we keep original start_time's date/time if user attempted modification.
            const originalStart = initial?.start_time;
            if (originalStart) {
                const [origDate, origTime] = String(originalStart).split(' ');
                // Force HH:mm back if changed
                const origHHmm = origTime?.slice(0,5);
                if (timeHHmm !== origHHmm) setTimeHHmm(origHHmm);
                setOverrideDateStr(origDate);
            }
        }
        const startTime = buildStartTime();
        // Client-side validation: disallow past start time
        try {
            const [datePart, timePart] = startTime.split(' ');
            const [y, m, d] = datePart.split('-').map(n => parseInt(n, 10));
            const [hh, mm, ss] = timePart.split(':').map(n => parseInt(n, 10));
            const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0);
            if (dt.getTime() < Date.now()) {
                Alert.alert('Lỗi', errorMessages.PAST_START_TIME);
                return;
            }
        } catch (e) {
            Alert.alert('Lỗi', errorMessages.INVALID_MOVIE_OR_START_TIME);
            return;
        }
        let priceNum = parseInt(basePrice, 10) || 0;
        if (mode === 'edit' && lockedDateTime && initial?.base_price != null) {
            // Force original price if locked
            priceNum = parseInt(initial.base_price, 10) || priceNum;
            if (String(basePrice) !== String(initial.base_price)) setBasePrice(String(initial.base_price));
        }

        const doAlertConflict = (res, actionMsg) => {
            const msg = errorMessages[res.code] || actionMsg;
            // Build detailed conflict times
            let detail = '';
            if (res.conflicts?.length) {
                const list = res.conflicts.slice(0, 5).map(c => `• Bắt đầu: ${c.start_time}\n  Kết thúc: ${c.end_time}`).join('\n');
                detail += `\nCác suất trùng/xung đột:\n${list}`;
                if (res.conflicts.length > 5) detail += `\n(+${res.conflicts.length - 5} nữa)`;
            }
            if (res.suggestion) {
                detail += `\nGợi ý giờ bắt đầu khả dụng: ${res.suggestion}`;
            }
            Alert.alert('Lịch bị xung đột', `${msg}${detail}`);
        };

        if (mode === 'create') {
            const res = createShowtimeWithValidation({ movieId, roomId, cinemaId, startTime, basePrice: priceNum, status });
            if (!res.success) {
                if (res.code === 'CONFLICT_30_MIN' || res.code === 'DUPLICATE_SHOWTIME') {
                    doAlertConflict(res, 'Không thể tạo suất chiếu');
                } else {
                    const msg = errorMessages[res.code] || 'Không thể tạo suất chiếu';
                    Alert.alert('Lỗi', msg);
                }
                return;
            }
            onSaved && onSaved('created', res.id);
            // Clear the form so the next create starts blank
            resetForm();
            onClose && onClose();
        } else {
            const id = initial?.id;
            const res = updateShowtimeWithValidation(id, { movieId, roomId, cinemaId, startTime, basePrice: priceNum, status });
            if (!res.success) {
                if (res.code === 'CONFLICT_30_MIN' || res.code === 'DUPLICATE_SHOWTIME') {
                    doAlertConflict(res, 'Không thể cập nhật suất chiếu');
                } else {
                    const msg = errorMessages[res.code] || 'Không thể cập nhật suất chiếu';
                    Alert.alert('Lỗi', msg);
                }
                return;
            }
            onSaved && onSaved('updated', id);
            onClose && onClose();
        }
    };

    const renderMovie = ({ item }) => (
        <TouchableOpacity
            style={[styles.rowItem, movieId === item.id && styles.rowItemActive]}
            onPress={() => setMovieId(item.id)}
        >
            <Text style={styles.rowItemTitle}>{item.title}</Text>
            <Text style={styles.rowItemMeta}>Năm: {item.release_year}</Text>
        </TouchableOpacity>
    );

    const renderRoom = ({ item }) => (
        <TouchableOpacity
            style={[styles.rowItem, roomId === item.id && styles.rowItemActive]}
            onPress={() => setRoomId(item.id)}
        >
            <Text style={styles.rowItemTitle}>{item.name}</Text>
            {roomId === item.id && <Text style={styles.rowItemMeta}>Đã chọn</Text>}
        </TouchableOpacity>
    );

    // Preview computed end time
    const previewStartTime = buildStartTime();
    const previewEndTime = useMemo(() => {
        if (!movieId) return null;
        return calculateEndTimeForShow(movieId, previewStartTime);
    }, [movieId, previewStartTime]);

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: 8 }}
                    >
                        <Text style={styles.title}>{mode === 'create' ? 'Tạo suất chiếu' : 'Cập nhật suất chiếu'}</Text>

                        {/* Movies */}
                        <Text style={styles.sectionTitle}>Phim {lockedDateTime && mode==='edit' ? '(Đã có vé - khóa)' : ''}</Text>
                        {lockedDateTime && mode==='edit' ? (
                            <View style={styles.lockedBox}><Text style={styles.lockedText}>Không thể đổi phim vì suất chiếu đã có vé.</Text></View>
                        ) : (
                            <>
                                <TextInput
                                    value={searchMovie}
                                    onChangeText={setSearchMovie}
                                    placeholder="Tìm phim..."
                                    placeholderTextColor={colors.textTertiary}
                                    style={commonStyles.input}
                                />
                                <ScrollView style={styles.listContainer} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                    {filteredMovies.map((item) => (
                                        <View key={`movie-${item.id}`}>
                                            {renderMovie({ item })}
                                        </View>
                                    ))}
                                </ScrollView>
                            </>
                        )}

                        {/* Rooms */}
                        <Text style={styles.sectionTitle}>Phòng chiếu {lockedDateTime && mode==='edit' ? '(Khóa)' : ''}</Text>
                        {lockedDateTime && mode==='edit' ? (
                            <View style={styles.lockedBox}><Text style={styles.lockedText}>Không thể đổi phòng vì đã có vé.</Text></View>
                        ) : (
                            <ScrollView style={styles.listContainerSmall} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                {rooms.map((item) => (
                                    <View key={`room-${item.id}`}>
                                        {renderRoom({ item })}
                                    </View>
                                ))}
                            </ScrollView>
                        )}

                        {/* Setup */}
                        <Text style={styles.sectionTitle}>Thiết lập</Text>
                        <View style={{ marginBottom: 8 }}>
                            <View style={styles.inputRow}>
                                <View style={styles.inputBlock}>
                                    <Text style={styles.label}>Ngày (YYYY-MM-DD){lockedDateTime && mode==='edit' ? ' (Khóa)' : ''}</Text>
                                    {lockedDateTime && mode==='edit' ? (
                                        <View style={styles.lockedBox}><Text style={styles.lockedText}>{overrideDateStr}</Text></View>
                                    ) : (
                                        <TextInput
                                            value={overrideDateStr}
                                            onChangeText={setOverrideDateStr}
                                            placeholder="2025-11-25"
                                            placeholderTextColor={colors.textTertiary}
                                            style={commonStyles.input}
                                        />
                                    )}
                                </View>
                                <View style={styles.inputBlock}>
                                    <Text style={styles.label}>Giờ bắt đầu (HH:mm){lockedDateTime && mode==='edit' ? ' (Khóa)' : ''}</Text>
                                    {lockedDateTime && mode==='edit' ? (
                                        <View style={styles.lockedBox}><Text style={styles.lockedText}>{timeHHmm}</Text></View>
                                    ) : (
                                        <TextInput
                                            value={timeHHmm}
                                            onChangeText={setTimeHHmm}
                                            placeholder="18:00"
                                            placeholderTextColor={colors.textTertiary}
                                            style={commonStyles.input}
                                        />
                                    )}
                                </View>
                            </View>
                            <View style={styles.inputRow}>
                                <View style={styles.inputBlock}>
                                    <Text style={styles.label}>Giá vé (VND){lockedDateTime && mode==='edit' ? ' (Khóa)' : ''}</Text>
                                    {lockedDateTime && mode==='edit' ? (
                                        <View style={styles.lockedBox}><Text style={styles.lockedText}>{Number(initial?.base_price).toLocaleString('vi-VN')} ₫</Text></View>
                                    ) : (
                                        <TextInput
                                            value={basePrice}
                                            onChangeText={setBasePrice}
                                            keyboardType="numeric"
                                            placeholder="90000"
                                            placeholderTextColor={colors.textTertiary}
                                            style={commonStyles.input}
                                        />
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* Status */}
                        <Text style={styles.sectionTitle}>Trạng thái</Text>
                        <View style={styles.statusRow}>
                            {StatusOptions.map((s) => (
                                <TouchableOpacity key={s} onPress={() => setStatus(s)} style={[commonStyles.chip, status === s && commonStyles.chipActive]}>
                                    <Text style={status === s ? commonStyles.chipTextActive : commonStyles.chipText}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Preview */}
                        <Text style={styles.sectionTitle}>Xem trước</Text>
                        <View style={styles.previewCard}>
                            <View style={styles.previewLine}>
                                <Text style={styles.previewLabel}>Phim:</Text>
                                <Text style={styles.previewValue}>{movieId ? movies.find(m => m.id === movieId)?.title : 'Chưa chọn'}</Text>
                            </View>
                            <View style={styles.previewLine}>
                                <Text style={styles.previewLabel}>Phòng:</Text>
                                <Text style={styles.previewValue}>{roomId ? rooms.find(r => r.id === roomId)?.name : 'Chưa chọn'}</Text>
                            </View>
                            <View style={styles.previewLine}>
                                <Text style={styles.previewLabel}>Bắt đầu:</Text>
                                <Text style={styles.previewValue}>{previewStartTime}{lockedDateTime && mode==='edit' ? ' (khóa)' : ''}</Text>
                            </View>
                            <View style={styles.previewLine}>
                                <Text style={styles.previewLabel}>Kết thúc dự kiến:</Text>
                                <Text style={styles.previewValue}>{previewEndTime || '—'}</Text>
                            </View>
                            <View style={styles.previewLine}>
                                <Text style={styles.previewLabel}>Giá vé:</Text>
                                <Text style={styles.previewValue}>{basePrice ? Number(basePrice).toLocaleString('vi-VN') + ' ₫' : '—'}</Text>
                            </View>
                            <View style={styles.previewLine}>
                                <Text style={styles.previewLabel}>Trạng thái:</Text>
                                <Text style={[styles.previewValue, styles.statusTag]}>{status}</Text>
                            </View>
                        </View>

                        {/* Actions */}
                        <View style={styles.actionBar}>
                            <TouchableOpacity onPress={onClose} style={[commonStyles.buttonOutline, { marginRight: 8 }]}>
                                <Text style={commonStyles.buttonText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} style={commonStyles.button}>
                                <Text style={commonStyles.buttonText}>{mode === 'create' ? 'Lưu' : 'Cập nhật'}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        padding: 16,
    },
    modalCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        maxHeight: '90%',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.accent,
        marginBottom: 6,
        marginTop: 4,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    label: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    listContainer: { height: 240, marginBottom: 12 },
    listContainerSmall: { height: 160, marginBottom: 12 },
    rowItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: colors.backgroundAlt,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        marginBottom: 8,
    },
    rowItemActive: {
        backgroundColor: colors.primaryDark,
        borderColor: colors.primary,
    },
    rowItemTitle: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    rowItemMeta: {
        color: colors.textTertiary,
        fontSize: 11,
    },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
    inputRow: { flexDirection: 'row', gap: 12 },
    inputBlock: { flex: 1 },
    previewCard: {
        backgroundColor: colors.backgroundAlt,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
    },
    previewLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    previewLabel: { color: colors.textTertiary, fontSize: 12 },
    previewValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
    statusTag: { backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    actionBar: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
    lockedBox: { backgroundColor: colors.backgroundAlt, borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 8 },
    lockedText: { color: colors.textSecondary, fontSize: 13, fontStyle: 'italic' },
});
