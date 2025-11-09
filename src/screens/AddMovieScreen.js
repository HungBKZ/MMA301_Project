// src/screens/AddMovieScreen.js
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
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { addMovie } from "../database/db";
import { colors, commonStyles } from "../styles/commonStyles";

/**
 * AddMovieScreen - Task 2: Add New Movie Screen
 * Màn hình thêm phim mới với image picker
 */
const AddMovieScreen = ({ navigation }) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Action");
  const [releaseYear, setReleaseYear] = useState("");
  const [status, setStatus] = useState("To Watch");
  const [posterUri, setPosterUri] = useState(null);

  // Danh sách categories phổ biến
  const categories = [
    "Action",
    "Comedy",
    "Drama",
    "Horror",
    "Science Fiction",
    "Romance",
    "Thriller",
    "Animation",
    "Documentary",
    "Fantasy",
  ];
  const statuses = ["To Watch", "Watched", "Favorite"];

  /**
   * Chọn ảnh từ thư viện
   */
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need camera roll permission to select a poster!"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPosterUri(result.assets[0].uri);
    }
  };

  /**
   * Chụp ảnh mới
   */
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Camera access is required!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPosterUri(result.assets[0].uri);
    }
  };

  /**
   * Hiển thị lựa chọn ảnh
   */
  const showImageOptions = () => {
    Alert.alert("Add Poster", "Choose an option", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  /**
   * Kiểm tra dữ liệu nhập vào
   */
  const validateInput = () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter movie title");
      return false;
    }
    const year = parseInt(releaseYear);
    const currentYear = new Date().getFullYear();
    if (!releaseYear || isNaN(year) || year < 1888 || year > currentYear + 5) {
      Alert.alert(
        "Error",
        `Please enter a valid release year (1888-${currentYear + 5})`
      );
      return false;
    }
    return true;
  };

  /**
   * Lưu movie mới vào database
   */
  const handleSave = () => {
    if (!validateInput()) return;

    const year = parseInt(releaseYear);
    const success = addMovie(title.trim(), category, year, status, posterUri);

    if (success) {
      Alert.alert("Success", `Added "${title}" to your collection!`, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert("Error", "Cannot add movie. Please try again.");
    }
  };

  /**
   * Xử lý khi bấm Cancel
   */
  const handleBack = () => {
    if (title || releaseYear || posterUri) {
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
          {/* Header */}
          <View style={styles.headerIcon}>
            <Ionicons name="add-circle" size={64} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Add New Movie</Text>

          {/* Poster Section */}
          <View style={styles.posterSection}>
            <Text style={styles.label}>Movie Poster</Text>
            <TouchableOpacity
              style={styles.posterContainer}
              onPress={showImageOptions}
              activeOpacity={0.7}
            >
              {posterUri ? (
                <Image source={{ uri: posterUri }} style={styles.posterImage} />
              ) : (
                <View style={styles.posterPlaceholder}>
                  <Ionicons
                    name="image-outline"
                    size={48}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.posterText}>Tap to add poster</Text>
                </View>
              )}
            </TouchableOpacity>

            {posterUri && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => setPosterUri(null)}
              >
                <Ionicons name="close-circle" size={20} color={colors.error} />
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Inception"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />
          </View>

          {/* Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={category}
                onValueChange={(itemValue) => setCategory(itemValue)}
                style={styles.picker}
                dropdownIconColor={colors.textPrimary}
              >
                {categories.map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Release Year */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Release Year *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2010"
              placeholderTextColor={colors.textSecondary}
              value={releaseYear}
              onChangeText={setReleaseYear}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>

          {/* Status */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={status}
                onValueChange={(itemValue) => setStatus(itemValue)}
                style={styles.picker}
                dropdownIconColor={colors.textPrimary}
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
  posterSection: {
    marginBottom: 20,
    alignItems: "center",
  },
  posterContainer: {
    width: 160,
    height: 240,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  posterImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  posterPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  posterText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  removeText: {
    fontSize: 14,
    color: colors.error,
    marginLeft: 4,
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
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  pickerContainer: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    color: colors.textPrimary,
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

export default AddMovieScreen;
