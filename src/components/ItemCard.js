// src/components/ItemCard.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../styles/commonStyles";

/**
 * Component hiển thị một shopping item trong danh sách
 * @param {Object} item - Đối tượng item chứa thông tin sản phẩm
 * @param {Function} onPress - Hàm callback khi nhấn vào card
 */
const ItemCard = ({ item, onPress }) => {
  // Xác định màu sắc badge dựa trên status
  const statusColor =
    item.status === "Wishlist" ? colors.wishlist : colors.purchased;

  // Icon cho từng category
  const getCategoryIcon = (category) => {
    switch (category) {
      case "Fashion":
        return "shirt-outline";
      case "Electronics":
        return "phone-portrait-outline";
      case "Home":
        return "home-outline";
      default:
        return "pricetag-outline";
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={getCategoryIcon(item.category)}
            size={24}
            color={colors.primary}
          />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.item_name}
          </Text>
          <Text style={styles.category}>{item.category}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.price}>
          {new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
          }).format(item.price)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default ItemCard;
