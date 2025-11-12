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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

  const renderItem = ({ item }) => {
    const createdAt = new Date(item.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <TouchableOpacity
        style={styles.collectionCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("CollectionDetail", { collectionId: item.id, collectionName: item.name })}
      >
        <View style={styles.collectionIconWrap}>
          <MaterialCommunityIcons name="folder-multiple" size={26} color={colors.primary} />
        </View>
        <View style={styles.collectionInfo}>
          <Text style={styles.collectionName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.collectionMeta}>Created {createdAt}</Text>
        </View>
        <View style={styles.collectionActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => openRenameModal(item)}>
            <MaterialCommunityIcons name="square-edit-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item)}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
          </TouchableOpacity>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyList = () => (
    <View style={commonStyles.emptyContainer}>
      <Ionicons name="albums-outline" size={72} color={colors.textSecondary} />
      <Text style={commonStyles.emptyText}>No collections yet</Text>
    </View>
  );

  const totalCollections = collections.length;

  return (
    <View style={commonStyles.container}>
      <View style={styles.headerCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Your Collections</Text>
          <Text style={styles.headerSubtitle}>
            {totalCollections > 0
              ? `You have ${totalCollections} curated ${totalCollections === 1 ? 'collection' : 'collections'}.`
              : 'Group movies into themed lists for faster discovery.'}
          </Text>
        </View>
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal} activeOpacity={0.85}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>New collection</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={collections}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        ListEmptyComponent={EmptyList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={
          totalCollections === 0 ? styles.emptyList : styles.listContent
        }
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
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 120,
    paddingHorizontal: 16,
    gap: 14,
  },
  emptyList: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  collectionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  collectionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  collectionMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  collectionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
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


