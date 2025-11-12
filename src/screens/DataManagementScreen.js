// src/screens/DataManagementScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { exportMoviesData, importMoviesData } from "../database/db";
import { useNavigation } from '@react-navigation/native';
import { colors, commonStyles } from "../styles/commonStyles";

/**
 * DataManagementScreen - Task 8: Data Export & Import
 * Cho phép xuất và nhập dữ liệu phim dưới dạng JSON
 */
const DataManagementScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  /** Xuất dữ liệu ra file JSON */
  const handleExportData = async () => {
    try {
      setIsLoading(true);
      console.log("Starting export...");

      const moviesData = exportMoviesData();
      console.log("Exported movies count:", moviesData.length);

      if (moviesData.length === 0) {
        Alert.alert("No Data", "There are no movies to export.");
        setIsLoading(false);
        return;
      }

      const jsonData = JSON.stringify(moviesData, null, 2);
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      const fileName = `movies_backup_${timestamp}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;

      console.log("Writing file to:", fileUri);
      await FileSystem.writeAsStringAsync(fileUri, jsonData);
      console.log("File written successfully");

      const canShare = await Sharing.isAvailableAsync();
      console.log("Can share:", canShare);

      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Export Movies Data",
          UTI: "public.json",
        });
        Alert.alert(
          "Export Successful",
          `Exported ${moviesData.length} movies to ${fileName}`
        );
      } else {
        Alert.alert(
          "Export Successful",
          `Data saved to: ${fileUri}\n\nTotal: ${moviesData.length} movies`
        );
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Export Failed", "Unable to export data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /** Nhập dữ liệu từ file JSON */
  const handleImportData = async () => {
    try {
      setIsLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      console.log("DocumentPicker result:", result);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log("Import canceled or no file selected");
        setIsLoading(false);
        return;
      }

      const fileUri = result.assets[0].uri;
      console.log("Reading file from:", fileUri);

      const fileContent = await FileSystem.readAsStringAsync(fileUri);

      const moviesData = JSON.parse(fileContent);
      console.log("Parsed movies data:", moviesData.length, "movies");

      if (!Array.isArray(moviesData) || moviesData.length === 0) {
        Alert.alert(
          "Invalid File",
          "The selected file does not contain valid movie data."
        );
        setIsLoading(false);
        return;
      }

      // Tạm thời tắt loading để hiển thị Alert
      setIsLoading(false);

      Alert.alert(
        "Import Options",
        `Found ${moviesData.length} movies.\nHow do you want to handle duplicate IDs?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Skip Duplicates",
            onPress: () => performImport(moviesData, false),
          },
          {
            text: "Overwrite",
            onPress: () => performImport(moviesData, true),
            style: "destructive",
          },
        ]
      );
    } catch (error) {
      console.error("Import error:", error);
      Alert.alert("Import Failed", "Unable to import data: " + error.message);
      setIsLoading(false);
    }
  };

  /** Thực hiện import dữ liệu */
  const performImport = async (moviesData, overwrite) => {
    try {
      setIsLoading(true);
      console.log("Performing import with overwrite:", overwrite);

      const result = importMoviesData(moviesData, overwrite);
      console.log("Import result:", result);

      const message = `Import completed!\n\nSuccessfully imported: ${result.success}\nFailed: ${result.failed}\nSkipped: ${result.skipped}`;

      Alert.alert("Import Complete", message, [
        {
          text: "OK",
          onPress: () => {
            console.log("Import completed successfully");
          },
        },
      ]);
    } catch (error) {
      console.error("Import error:", error);
      Alert.alert("Import Failed", "Unable to import data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /** Tạo sample data để test */
  const createSampleData = () => {
    const sampleMovies = [
      {
        title: "Inception",
        category: "Science Fiction",
        release_year: 2010,
        status: "Watched",
        poster_uri:
          "https://image.tmdb.org/t/p/w500/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg",
      },
      {
        title: "The Shawshank Redemption",
        category: "Drama",
        release_year: 1994,
        status: "Favorite",
        poster_uri:
          "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
      },
      {
        title: "The Dark Knight",
        category: "Action",
        release_year: 2008,
        status: "Favorite",
        poster_uri:
          "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
      },
    ];
    return JSON.stringify(sampleMovies, null, 2);
  };

  /** Xuất file template mẫu */
  const handleExportTemplate = async () => {
    try {
      setIsLoading(true);
      console.log("Creating sample template...");

      const templateData = createSampleData();
      const fileName = "movies_template.json";
      const fileUri = FileSystem.documentDirectory + fileName;

      console.log("Writing template to:", fileUri);
      await FileSystem.writeAsStringAsync(fileUri, templateData);
      console.log("Template written successfully");

      const canShare = await Sharing.isAvailableAsync();
      console.log("Can share template:", canShare);

      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Sample Movies Template",
          UTI: "public.json",
        });
      }

      Alert.alert("Template Created", "Sample template file has been created.");
    } catch (error) {
      console.error("Template error:", error);
      Alert.alert("Error", "Unable to create template: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={commonStyles.container}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerCard}>
          <Ionicons name="folder-open" size={48} color={colors.accent} />
          <Text style={styles.headerTitle}>Data Management</Text>
          <Text style={styles.headerSubtitle}>
            Export and import your movie collection
          </Text>
        </View>

        {/* Export Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cloud-upload" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Export Data</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Export all your movies to a JSON file for backup or sharing.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.exportButton]}
            onPress={handleExportData}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <Ionicons name="download" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Export All Movies</Text>
          </TouchableOpacity>
        </View>

        {/* Import Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cloud-download" size={24} color={colors.success} />
            <Text style={styles.sectionTitle}>Import Data</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Import movies from a JSON file. You can choose to skip or overwrite
            duplicates.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.importButton]}
            onPress={handleImportData}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Import from File</Text>
          </TouchableOpacity>
        </View>

        {/* Template Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={24} color={colors.accent} />
            <Text style={styles.sectionTitle}>Sample Template</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Download a sample JSON template with example movies to understand
            the data structure.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.templateButton]}
            onPress={handleExportTemplate}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <Ionicons name="document" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Download Template</Text>
          </TouchableOpacity>
        </View>

        {/* Showtime admin navigation */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="film" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Showtime Management</Text>
          </View>
          <Text style={styles.sectionDescription}>Create, edit và kiểm tra xung đột suất chiếu theo rạp/phòng/ngày.</Text>
          <TouchableOpacity
            style={[styles.button, styles.exportButton]}
            onPress={() => navigation.navigate('ShowtimeAdmin')}
            activeOpacity={0.85}
          >
            <Ionicons name="time" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Go to Showtime Admin</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.accent} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Data Format</Text>
            <Text style={styles.infoText}>
              JSON format with fields: title, category, release_year, status,
              poster_uri
            </Text>
          </View>
        </View>

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  headerCard: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  section: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  exportButton: { backgroundColor: colors.primary },
  importButton: { backgroundColor: colors.success },
  templateButton: { backgroundColor: colors.accent },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  infoContent: { flex: 1, marginLeft: 12 },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  infoText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  loadingContainer: { alignItems: "center", marginTop: 24 },
  loadingText: { fontSize: 16, color: colors.textSecondary, marginTop: 12 },
});

export default DataManagementScreen;