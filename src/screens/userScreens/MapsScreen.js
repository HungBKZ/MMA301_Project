import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { colors, commonStyles } from "../../styles/commonStyles";
import { findNearbyCinemas as findNearbyCinemasDB } from "../../database/db";

// Vị trí mặc định: Cần Thơ, Việt Nam
const DEFAULT_LOCATION = {
  latitude: 10.0452,
  longitude: 105.7469,
};

export default function MapsScreen() {
  const [loading, setLoading] = useState(false);
  const [cinemas, setCinemas] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [locationError, setLocationError] = useState(false);

  // Lấy vị trí người dùng khi component mount
  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(true);
        console.log("Location permission denied, using default location");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 5000,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setLocationError(false);
      console.log("User location:", location.coords);
    } catch (error) {
      console.log("Error getting location, using default:", error);
      setLocationError(true);
    }
  };

  const handleFindCinemas = async () => {
    try {
      setLoading(true);
      setShowResults(false);

      console.log("🔍 Finding cinemas near:", userLocation);

      // Tìm rạp từ database (bán kính 15km)
      const nearbyCinemas = findNearbyCinemasDB(
        userLocation.latitude,
        userLocation.longitude,
        15
      );

      console.log("📍 Found cinemas from DB:", nearbyCinemas);
      console.log("📊 Number of cinemas:", nearbyCinemas.length);

      if (nearbyCinemas.length === 0) {
        Alert.alert("Thông báo", "Không tìm thấy rạp chiếu phim gần vị trí của bạn trong bán kính 15km.");
        setLoading(false);
        return;
      }

      // Chỉ lấy 3 rạp gần nhất và đổi tên thành AquaCode Cinema 1, 2, 3
      const top3Cinemas = nearbyCinemas.slice(0, 3);

      // Format cinemas với tên AquaCode Cinema và id
      const formattedCinemas = top3Cinemas.map((cinema, index) => ({
        id: index + 1,
        latitude: cinema.latitude,
        longitude: cinema.longitude,
        title: `CGV Cinema ${index + 1}`,
        address: cinema.address,
        phone: cinema.phone,
        distance: cinema.distance,
        facilities: cinema.facilities,
        totalScreens: cinema.total_screens,
        openingHours: cinema.opening_hours,
        website: cinema.website
      }));

      setCinemas(formattedCinemas);
      setShowResults(true);

    } catch (error) {
      console.error("Error finding cinemas:", error);
      Alert.alert("Lỗi", "Không thể tìm rạp chiếu phim. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const openMap = (latitude, longitude, title) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Lỗi", "Không thể mở bản đồ")
    );
  };

  const callPhone = (phoneNumber) => {
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() =>
      Alert.alert("Lỗi", "Không thể gọi điện")
    );
  };

  const openWebsite = (url) => {
    Linking.openURL(url).catch(() =>
      Alert.alert("Lỗi", "Không thể mở website")
    );
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ==================== HEADER ==================== */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="location" size={28} color={colors.primary} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.headerSubtitle}>Find Cinemas</Text>
            <Text style={styles.headerTitle}>Near You</Text>
          </View>
        </View>

        {locationError && (
          <View style={styles.locationWarningContainer}>
            <Ionicons name="warning" size={16} color={colors.warning} />
            <Text style={styles.locationWarning}>
              Không lấy được vị trí GPS. Sử dụng vị trí mặc định (Cần Thơ)
            </Text>
          </View>
        )}
      </View>

      {/* ==================== MAP CONTAINER ==================== */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
          }}
          region={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
          }}
          showsUserLocation={!locationError}
          showsMyLocationButton={true}
        >
          {/* Marker vị trí người dùng */}
          <Marker
            coordinate={userLocation}
            title="Vị trí của bạn"
            description={locationError ? "Vị trí mặc định" : "Vị trí hiện tại"}
            pinColor="blue"
          />

          {/* Markers cho các rạp tìm được */}
          {cinemas.map((cinema, index) => (
            <Marker
              key={index}
              coordinate={{
                latitude: cinema.latitude,
                longitude: cinema.longitude,
              }}
              title={cinema.title}
              description={cinema.address}
              pinColor="red"
            />
          ))}
        </MapView>

        {/* Search Button Overlay */}
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleFindCinemas}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="search" size={20} color="#FFFFFF" />
              <Text style={styles.searchButtonText}>Find Cinemas Near You</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ==================== LOADING STATE ==================== */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang tìm rạp gần bạn...</Text>
          <Text style={styles.loadingSubtext}>Vui lòng chờ...</Text>
        </View>
      )}

      {/* ==================== RESULTS CONTAINER ==================== */}
      {showResults && !loading && (
        <View style={styles.resultsContainer}>
          {cinemas.length > 0 && (
            <View style={styles.cinemaListContainer}>
              <View style={styles.resultsHeader}>
                <Ionicons name="pin" size={24} color={colors.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.resultTitle}>Find {cinemas.length} Cinemas</Text>
                  <Text style={styles.resultSubtitle}>Within 15km of your location</Text>
                </View>
              </View>

              {/* Cinema Cards */}
              {cinemas.map((cinema, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.cinemaCard}
                  onPress={() => openMap(cinema.latitude, cinema.longitude, cinema.title)}
                  activeOpacity={0.8}
                >
                  {/* Card Header */}
                  <View style={styles.cinemaHeader}>
                    <View style={styles.cinemaRankContainer}>
                      <Text style={styles.cinemaRank}>{index + 1}</Text>
                    </View>
                    <View style={styles.cinemaMainInfo}>
                      <Text style={styles.cinemaTitle}>{cinema.title}</Text>
                      <View style={styles.distanceRow}>
                        <Ionicons name="location" size={14} color={colors.accent} />
                        <Text style={styles.cinemaDistance}>
                          {cinema.distance ? cinema.distance.toFixed(2) : '?'} km
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardBadge}>
                      <Ionicons name="map" size={20} color={colors.primary} />
                    </View>
                  </View>

                  {/* Card Details */}
                  <View style={styles.divider} />

                  <View style={styles.cinemaDetails}>
                    {/* Address */}
                    <View style={styles.detailRow}>
                      <Ionicons name="location-sharp" size={16} color={colors.primary} />
                      <Text style={styles.detailText}>{cinema.address}</Text>
                    </View>

                    {/* Phone */}
                    {cinema.phone && (
                      <TouchableOpacity
                        style={styles.detailRow}
                        onPress={() => callPhone(cinema.phone)}
                      >
                        <Ionicons name="call" size={16} color={colors.accent} />
                        <Text style={[styles.detailText, styles.clickableText]}>
                          {cinema.phone}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Facilities */}
                    {cinema.facilities && (
                      <View style={styles.detailRow}>
                        <Ionicons name="star" size={16} color={colors.accent} />
                        <Text style={styles.detailText}>{cinema.facilities}</Text>
                      </View>
                    )}

                    {/* Screens */}
                    {cinema.totalScreens && (
                      <View style={styles.detailRow}>
                        <Ionicons name="film" size={16} color={colors.primary} />
                        <Text style={styles.detailText}>{cinema.totalScreens} rooms</Text>
                      </View>
                    )}

                    {/* Hours */}
                    {cinema.openingHours && (
                      <View style={styles.detailRow}>
                        <Ionicons name="time" size={16} color={colors.accent} />
                        <Text style={styles.detailText}>{cinema.openingHours}</Text>
                      </View>
                    )}

                    {/* Website */}
                    {cinema.website && (
                      <TouchableOpacity
                        style={styles.detailRow}
                        onPress={() => openWebsite(cinema.website)}
                      >
                        <Ionicons name="globe" size={16} color={colors.primary} />
                        <Text style={[styles.detailText, styles.clickableText]}>
                          Website
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Tap Hint */}
                  <Text style={styles.tapHint}>
                    Tap to see directions on Google Maps
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ==================== HEADER ====================
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },

  locationWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.warning,
  },

  locationWarning: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
    flex: 1,
  },

  // ==================== MAP CONTAINER ====================
  mapContainer: {
    height: 340,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.primary,
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  searchButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    left: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    elevation: 5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },

  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ==================== LOADING STATE ====================
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },

  loadingSubtext: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // ==================== RESULTS CONTAINER ====================
  resultsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  cinemaListContainer: {
    marginTop: 8,
  },

  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 12,
  },

  resultTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },

  resultSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },

  // ==================== CINEMA CARD ====================
  cinemaCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  cinemaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  cinemaRankContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  cinemaRank: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  cinemaMainInfo: {
    flex: 1,
  },

  cinemaTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },

  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 184, 28, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.accent,
  },

  cinemaDistance: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },

  cardBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12,
  },

  cinemaDetails: {
    gap: 10,
    marginBottom: 12,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },

  clickableText: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '700',
  },

  tapHint: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    fontWeight: '500',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

