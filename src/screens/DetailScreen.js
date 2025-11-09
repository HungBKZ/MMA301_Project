// src/screens/DetailScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getItemById, updateItemStatus, deleteItem } from "../database/db";
import { colors, commonStyles } from "../styles/commonStyles";

/**
 * DetailScreen - Màn hình chi tiết shopping item
 * Task 3: Item Detail Screen
 */
const DetailScreen = ({ route, navigation }) => {
  const { itemId } = route.params;
  const [item, setItem] = useState(null);

  /** Load thông tin chi tiết item từ database */
  useEffect(() => {
    loadItemDetails();
  }, [itemId]);

  const loadItemDetails = () => {
    const itemData = getItemById(itemId);
    if (itemData) {
      setItem(itemData);
    } else {
      Alert.alert("Error", "Item not found", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }
  };

  /** Toggle status (Wishlist ↔ Purchased) */
  const handleToggleStatus = () => {
    const newStatus = item.status === "Wishlist" ? "Purchased" : "Wishlist";
    Alert.alert("Confirm", `Change status to "${newStatus}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => {
          const success = updateItemStatus(itemId, newStatus);
          if (success) {
            setItem({ ...item, status: newStatus });
            Alert.alert("Success", `Status updated to "${newStatus}"`);
          } else {
            Alert.alert("Error", "Cannot update status");
          }
        },
      },
    ]);
  };

  /** Xử lý xóa item */
  const handleDelete = () => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${item.item_name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const success = deleteItem(itemId);
            if (success) {
              Alert.alert("Success", "Item deleted", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } else {
              Alert.alert("Error", "Cannot delete item");
            }
          },
        },
      ]
    );
  };

  /** Xử lý nút Back */
  const handleBack = () => {
    navigation.goBack();
  };

  // Nếu dữ liệu chưa load xong
  if (!item) {
    return (
      <View style={[commonStyles.container, styles.loadingContainer]}>
        <Text style={commonStyles.emptyText}>Loading...</Text>
      </View>
    );
  }

  // Màu status
  const statusColor =
    item.status === "Wishlist" ? colors.wishlist : colors.purchased;

  // Icon theo category
  const getCategoryIcon = (category) => {
    switch (category) {
      case "Fashion":
        return "shirt";
      case "Electronics":
        return "phone-portrait";
      case "Home":
        return "home";
      default:
        return "pricetag";
    }
  };

  return (
    <ScrollView style={commonStyles.container}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerCard}>
          <View
            style={[styles.iconCircle, { backgroundColor: statusColor + "20" }]}
          >
            <Ionicons
              name={getCategoryIcon(item.category)}
              size={64}
              color={statusColor}
            />
          </View>
          <Text style={styles.itemName}>{item.item_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        {/* Detail Info */}
        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>Detail Information</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons name="key" size={20} color={colors.textSecondary} />
              <Text style={styles.labelText}>ID</Text>
            </View>
            <Text style={styles.valueText}>#{item.id}</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons name="grid" size={20} color={colors.textSecondary} />
              <Text style={styles.labelText}>Category</Text>
            </View>
            <Text style={styles.valueText}>{item.category}</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons name="cash" size={20} color={colors.textSecondary} />
              <Text style={styles.labelText}>Price</Text>
            </View>
            <Text style={[styles.valueText, styles.priceText]}>
              {new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(item.price)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons name="flag" size={20} color={colors.textSecondary} />
              <Text style={styles.labelText}>Status</Text>
            </View>
            <Text
              style={[
                styles.valueText,
                { color: statusColor, fontWeight: "bold" },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.warning }]}
            onPress={handleToggleStatus}
            activeOpacity={0.8}
          >
            <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {item.status === "Wishlist"
                ? "Mark as\nPurchased"
                : "Move to\nWishlist"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error }]}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Ionicons name="trash" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.textSecondary },
            ]}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  loadingContainer: { justifyContent: "center", alignItems: "center" },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    elevation: 3,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  itemName: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  statusText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { flexDirection: "row", alignItems: "center" },
  labelText: { fontSize: 16, color: colors.textSecondary, marginLeft: 8 },
  valueText: { fontSize: 16, color: colors.textPrimary, fontWeight: "500" },
  priceText: { color: colors.primary, fontWeight: "bold" },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
});

export default DetailScreen;
