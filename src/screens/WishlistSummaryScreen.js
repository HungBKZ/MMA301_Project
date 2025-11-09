// src/screens/WishlistSummaryScreen.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getWishlistItems, getTotalWishlistCost } from "../database/db";
import { colors, commonStyles } from "../styles/commonStyles";

/**
 * WishlistSummaryScreen - Task 4
 * Màn hình hiển thị danh sách wishlist và tổng chi phí ước tính
 */
const WishlistSummaryScreen = ({ navigation }) => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  /** Load wishlist data và tổng giá trị */
  const loadWishlistData = () => {
    const items = getWishlistItems();
    const total = getTotalWishlistCost();
    setWishlistItems(items);
    setTotalCost(total);
  };

  /** Reload mỗi khi focus lại màn hình */
  useFocusEffect(
    useCallback(() => {
      loadWishlistData();
    }, [])
  );

  /** Pull-to-refresh */
  const onRefresh = () => {
    setRefreshing(true);
    loadWishlistData();
    setRefreshing(false);
  };

  /** Icon theo category */
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

  /** Render từng item */
  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => navigation.navigate("Detail", { itemId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.itemNumber}>
        <Text style={styles.numberText}>{index + 1}</Text>
      </View>

      <View style={styles.iconContainer}>
        <Ionicons
          name={getCategoryIcon(item.category)}
          size={24}
          color={colors.wishlist}
        />
      </View>

      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.item_name}
        </Text>
        <Text style={styles.category}>{item.category}</Text>
      </View>

      <Text style={styles.price}>
        {new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(item.price)}
      </Text>
    </TouchableOpacity>
  );

  /** Khi wishlist trống */
  const renderEmptyList = () => (
    <View style={commonStyles.emptyContainer}>
      <Ionicons name="heart-outline" size={80} color={colors.textSecondary} />
      <Text style={commonStyles.emptyText}>
        No items in Wishlist{"\n"}Add favorite items from the home screen
      </Text>
    </View>
  );

  /** Header */
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerIcon}>
        <Ionicons name="heart" size={48} color={colors.wishlist} />
      </View>
      <Text style={styles.headerTitle}>Wishlist</Text>
      <Text style={styles.headerSubtitle}>
        {wishlistItems.length} {wishlistItems.length === 1 ? "item" : "items"}{" "}
        in wishlist
      </Text>
    </View>
  );

  /** Footer tổng hợp */
  const renderFooter = () => {
    if (wishlistItems.length === 0) return null;
    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="calculator" size={24} color={colors.primary} />
          <Text style={styles.summaryTitle}>Total Estimate</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Number of items:</Text>
          <Text style={styles.summaryValue}>{wishlistItems.length}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total cost:</Text>
          <Text style={styles.totalAmount}>
            {new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(totalCost)}
          </Text>
        </View>

        <View style={styles.noteContainer}>
          <Ionicons
            name="information-circle"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={styles.noteText}>
            This is the estimated total for items you want to buy.
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={commonStyles.container}>
      <FlatList
        data={wishlistItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={wishlistItems.length === 0 && styles.emptyList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.surface,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    elevation: 2,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.wishlist + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyList: {
    flexGrow: 1,
  },
  itemCard: {
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.wishlist,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  numberText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  category: { fontSize: 12, color: colors.textSecondary },
  price: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.wishlist,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: colors.wishlist,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginLeft: 12,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 16, color: colors.textSecondary },
  summaryValue: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  totalAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.wishlist,
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  noteText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
});

export default WishlistSummaryScreen;
