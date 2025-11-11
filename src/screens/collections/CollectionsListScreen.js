import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../auth/AuthContext";
import {
  getCollectionsByUser,
  createCollection,
  renameCollection,
  deleteCollectionById,
} from "../../database/db";
import { colors, commonStyles } from "../../styles/commonStyles";

export default function CollectionsListScreen({ navigation }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [collections, setCollections] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nameInput, setNameInput] = useState("");

  const loadData = () => {
    if (!userId) return;
    const rows = getCollectionsByUser(userId) || [];
    setCollections(rows);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [userId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setNameInput("");
    setModalVisible(true);
  };

  const openRenameModal = (collection) => {
    setEditingId(collection.id);
    setNameInput(collection.name);
    setModalVisible(true);
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert("Validation", "Please enter a collection name.");
      return;
    }
    if (editingId) {
      const ok = renameCollection(editingId, trimmed);
      if (!ok) {
        Alert.alert("Error", "Cannot rename collection.");
      }
    } else {
      const r = createCollection(userId, trimmed);
      if (!r.success) {
        Alert.alert("Error", "Cannot create collection (maybe name duplicated).");
      }
    }
    setModalVisible(false);
    loadData();
  };

  const handleDelete = (collection) => {
    Alert.alert(
      "Delete",
      `Delete collection "${collection.name}"? All items inside will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const ok = deleteCollectionById(collection.id);
            if (!ok) {
              Alert.alert("Error", "Cannot delete collection.");
            }
            loadData();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.collectionCard}
      activeOpacity={0.8}
      onPress={() => navigation.navigate("CollectionDetail", { collectionId: item.id, collectionName: item.name })}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="albums" size={24} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.collectionName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.collectionMeta}>{new Date(item.created_at).toLocaleString()}</Text>
      </View>
      <TouchableOpacity style={styles.iconBtn} onPress={() => openRenameModal(item)}>
        <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}>
        <Ionicons name="trash-outline" size={20} color={colors.danger || "#E53935"} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const EmptyList = () => (
    <View style={commonStyles.emptyContainer}>
      <Ionicons name="albums-outline" size={72} color={colors.textSecondary} />
      <Text style={commonStyles.emptyText}>No collections yet</Text>
    </View>
  );

  return (
    <View style={commonStyles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Collections</Text>
        <TouchableOpacity style={styles.createBtn} onPress={openCreateModal} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={collections}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        ListEmptyComponent={EmptyList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? "Rename Collection" : "Create Collection"}</Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Collection name"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveName}>
                <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>{editingId ? "Save" : "Create"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  createBtn: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  createBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 6,
  },
  collectionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + "22",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  collectionMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  iconBtn: {
    padding: 8,
    marginLeft: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  cancelBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  modalBtnText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
});


