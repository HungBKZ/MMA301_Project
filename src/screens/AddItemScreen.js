// src/screens/AddItemScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { addItem } from "../database/db";
import { colors, commonStyles } from "../styles/commonStyles";

/**
 * AddItemScreen - Màn hình thêm shopping item mới
 * Task 2: Add New Shopping Item Screen
 */
const AddItemScreen = ({ navigation }) => {
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Fashion");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("Wishlist");

  // Danh sách categories & statuses
  const categories = ["Fashion", "Electronics", "Home"];
  const statuses = ["Wishlist", "Purchased"];

  /**
   * Validate dữ liệu nhập vào
   */
  const validateInput = () => {
    if (!itemName.trim()) {
      Alert.alert("Error", "Please enter item name");
      return false;
    }
    const priceNumber = parseFloat(price);
    if (!price || isNaN(priceNumber) || priceNumber <= 0) {
      Alert.alert("Error", "Please enter a valid price (positive number)");
      return false;
    }
    return true;
  };

  /**
   * Xử lý lưu item mới vào database
   */
  const handleSave = () => {
    if (!validateInput()) return;

    const priceNumber = parseFloat(price);
    const success = addItem(itemName.trim(), category, priceNumber, status);

    if (success) {
      Alert.alert(
        "Success",
        `Added "${itemName}" to ${
          status === "Wishlist" ? "wishlist" : "purchased items"
        }`,
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      Alert.alert("Error", "Cannot add item. Please try again.");
    }
  };

  /**
   * Xử lý nút Back
   */
  const handleBack = () => {
    if (itemName || price) {
      Alert.alert(
        "Confirm",
        "You have unsaved data. Are you sure you want to exit?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Exit", onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={commonStyles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          {/* Header Icon */}
          <View style={styles.headerIcon}>
            <Ionicons name="add-circle" size={64} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Add New Item</Text>

          {/* Item Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Name *</Text>
            <TextInput
              style={commonStyles.input}
              placeholder="e.g. Nike Air Force 1"
              value={itemName}
              onChangeText={setItemName}
              maxLength={100}
            />
          </View>

          {/* Category Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={category}
                onValueChange={(itemValue) => setCategory(itemValue)}
                style={styles.picker}
              >
                {categories.map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Price Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price (VND) *</Text>
            <TextInput
              style={commonStyles.input}
              placeholder="e.g. 2500000"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </View>

          {/* Status Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={status}
                onValueChange={(itemValue) => setStatus(itemValue)}
                style={styles.picker}
              >
                {statuses.map((stat) => (
                  <Picker.Item key={stat} label={stat} value={stat} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
  },
  headerIcon: {
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
    elevation: 2,
  },
  saveButton: {
    backgroundColor: colors.success,
  },
  cancelButton: {
    backgroundColor: colors.textSecondary,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default AddItemScreen;
