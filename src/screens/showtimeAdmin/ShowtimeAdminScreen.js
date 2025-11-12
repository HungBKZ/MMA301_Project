// src/screens/showtimeAdmin/ShowtimeAdminScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, ScrollView } from 'react-native';
import { colors, commonStyles } from '../../styles/commonStyles';
import { getAllCinemas, getMovieById } from '../../database/db';
import { hasActiveTickets } from '../../database/ticketDB';
import { getRoomsByCinemaId } from '../../database/roomDB';
import { getShowtimesByDate, deleteShowtime, getShowtimeById } from '../../database/showtimeDB';
import ShowtimeFormModal from './ShowtimeFormModal';

export default function ShowtimeAdminScreen() {
  const [cinemas, setCinemas] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0,10));
  const [showtimes, setShowtimes] = useState([]);
  const [movieMap, setMovieMap] = useState({}); // { movie_id: title }
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  useEffect(() => {
    try {
      const cs = getAllCinemas();
      setCinemas(cs);
      if (cs?.length && !selectedCinema) setSelectedCinema(cs[0]);
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!selectedCinema) { setRooms([]); return; }
    const rs = getRoomsByCinemaId(selectedCinema.id) || [];
    setRooms(rs);
    setSelectedRoom(null);
  }, [selectedCinema]);

  const loadShowtimes = () => {
    try {
      if (!selectedCinema) return;
      const data = getShowtimesByDate(dateStr, selectedCinema.id) || [];
      setShowtimes(data);
      // Build movie title map for displayed showtimes
      const ids = Array.from(new Set(data.map(s => s.movie_id).filter(Boolean)));
      const map = {};
      ids.forEach(id => {
        try { map[id] = getMovieById(id)?.title || `Phim #${id}`; } catch(e) { map[id] = `Phim #${id}`; }
      });
      setMovieMap(map);
    } catch (e) {
      console.log('Error load showtimes', e);
      setShowtimes([]);
      setMovieMap({});
    }
  };

  useEffect(() => {
    loadShowtimes();
  }, [selectedCinema, dateStr]);

  const filteredByRoom = useMemo(() => {
    if (!selectedRoom) return showtimes;
    return showtimes.filter(s => s.room_id === selectedRoom.id);
  }, [showtimes, selectedRoom]);

  const groupByRoom = useMemo(() => {
    const map = new Map();
    filteredByRoom.forEach((s) => {
      const key = s.room_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });
    return Array.from(map.entries()).map(([roomId, items]) => ({ roomId, items }));
  }, [filteredByRoom]);

  const handleDelete = (id) => {
    try {
      if (hasActiveTickets(id)) {
        Alert.alert('Không thể xóa', 'Suất chiếu đã có vé được giữ/mua. Vui lòng hủy vé trước khi xóa.');
        return;
      }
    } catch (e) { /* ignore */ }
    Alert.alert('Xóa suất chiếu', 'Bạn chắc chắn muốn xóa?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => {
        const res = deleteShowtime(id);
        if (!res.success) {
          Alert.alert('Lỗi', 'Không thể xóa');
          return;
        }
        loadShowtimes();
      }}
    ]);
  };

  const openCreate = () => {
    setEditTarget(null);
    setModalVisible(true);
  };

  const openEdit = (item) => {
    // If has tickets, prevent date/time edit (will be enforced inside modal via prop)
    const locked = hasActiveTickets(item.id);
    setEditTarget({ ...item, _locked: locked });
    setModalVisible(true);
  };

  const renderRoomHeader = (roomId) => {
    const r = rooms.find(r => r.id === roomId);
    return (
      <View style={[styles.roomHeader, commonStyles.shadow]}>
        <Text style={styles.roomTitle}>{r?.name || `Phòng ${roomId}`}</Text>
      </View>
    );
  };

  const renderShowtime = ({ item }) => {
    const movieTitle = movieMap[item.movie_id] || `Phim #${item.movie_id}`;
    return (
      <View style={[styles.showtimeRow]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.showtimeMovie}>{movieTitle}</Text>
          <Text style={styles.showtimeText}>{item.start_time} → {item.end_time}</Text>
          <Text style={styles.showtimeMeta}>Phòng #{item.room_id} • Giá: {item.base_price?.toLocaleString?.() || item.base_price} • {item.status}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[commonStyles.buttonOutline, { paddingHorizontal: 12 }]} onPress={() => openEdit(item)}>
            <Text style={commonStyles.buttonText}>Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[commonStyles.button, { paddingHorizontal: 12 }]} onPress={() => handleDelete(item.id)}>
            <Text style={commonStyles.buttonText}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={commonStyles.container}>
      {/* Filters */}
      <View style={[commonStyles.card, { marginTop: 16 }]}>
        <Text style={commonStyles.title}>Quản lý Suất Chiếu</Text>
        {/* Cinemas */}
        <Text style={styles.label}>Rạp</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {cinemas.map(c => (
            <TouchableOpacity key={c.id} onPress={() => setSelectedCinema(c)} style={selectedCinema?.id === c.id ? commonStyles.chipActive : commonStyles.chip}>
              <Text style={selectedCinema?.id === c.id ? commonStyles.chipTextActive : commonStyles.chipText}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Rooms */}
        <Text style={styles.label}>Phòng</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <TouchableOpacity onPress={() => setSelectedRoom(null)} style={!selectedRoom ? commonStyles.chipActive : commonStyles.chip}>
            <Text style={!selectedRoom ? commonStyles.chipTextActive : commonStyles.chipText}>Tất cả</Text>
          </TouchableOpacity>
          {rooms.map(r => (
            <TouchableOpacity key={r.id} onPress={() => setSelectedRoom(r)} style={selectedRoom?.id === r.id ? commonStyles.chipActive : commonStyles.chip}>
              <Text style={selectedRoom?.id === r.id ? commonStyles.chipTextActive : commonStyles.chipText}>{r.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Date */}
        <Text style={styles.label}>Ngày (YYYY-MM-DD)</Text>
        <TextInput value={dateStr} onChangeText={setDateStr} style={commonStyles.input} placeholder="2025-11-25" placeholderTextColor={colors.textTertiary} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={loadShowtimes} style={[commonStyles.buttonOutline, { flex: 1, marginRight: 8 }]}> 
            <Text style={commonStyles.buttonText}>Tải lịch</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openCreate} style={[commonStyles.button, { flex: 1 }]}> 
            <Text style={commonStyles.buttonText}>Tạo suất chiếu</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <FlatList
        style={{ flex: 1, marginTop: 8 }}
        data={groupByRoom}
        keyExtractor={(g) => String(g.roomId)}
        renderItem={({ item }) => (
          <View style={commonStyles.card}>
            {renderRoomHeader(item.roomId)}
            <FlatList data={item.items} keyExtractor={(i) => String(i.id)} renderItem={renderShowtime} />
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={commonStyles.emptyContainer}>
            <Text style={commonStyles.emptyText}>Không có suất chiếu cho bộ lọc hiện tại.</Text>
          </View>
        )}
      />

      <ShowtimeFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        mode={editTarget ? 'edit' : 'create'}
        initial={editTarget}
        cinemaId={selectedCinema?.id}
        dateStr={dateStr}
        onSaved={() => { setModalVisible(false); loadShowtimes(); }}
        lockedDateTime={!!editTarget?._locked}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  roomHeader: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 8,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  showtimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  showtimeText: { color: colors.textPrimary, fontSize: 14 },
  showtimeMovie: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  showtimeMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
