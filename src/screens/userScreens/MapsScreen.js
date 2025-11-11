import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { colors } from "../../styles/commonStyles";
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
        title: `AquaCode Cinema ${index + 1}`,
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tim Rap Chieu Phim</Text>
        {locationError && (
          <Text style={styles.locationWarning}>
            ⚠️ Khong lay duoc vi tri GPS. Su dung vi tri mac dinh (Can Tho)
          </Text>
        )}
      </View>

      {/* Map hiển thị vị trí */}
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
            title="Vi tri cua ban"
            description={locationError ? "Vi tri mac dinh" : "Vi tri hien tai"}
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
      </View>

      <View style={styles.buttonGroup}>
        <Button
          title="Tim Rap Gan Day"
          onPress={handleFindCinemas}
          color={colors.primary}
          disabled={loading}
        />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Dang tim rap gan ban...</Text>
        </View>
      )}

      {showResults && !loading && (
        <View style={styles.resultsContainer}>
          {/* Cinema List */}
          {cinemas.length > 0 && (
            <View style={styles.cinemaListContainer}>
              <Text style={styles.sectionTitle}>
                📍 Tim thay {cinemas.length} rap chieu phim:
              </Text>
              {cinemas.map((cinema, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.cinemaCard}
                  onPress={() => openMap(cinema.latitude, cinema.longitude, cinema.title)}
                >
                  <View style={styles.cinemaHeader}>
                    <Text style={styles.cinemaNumber}>{index + 1}</Text>
                    <View style={styles.cinemaMainInfo}>
                      <Text style={styles.cinemaTitle}>{cinema.title}</Text>
                      <Text style={styles.cinemaDistance}>
                        📏 Cach ban: {cinema.distance ? cinema.distance.toFixed(2) : '?'} km
                      </Text>
                    </View>
                    <Text style={styles.mapIcon}>🗺️</Text>
                  </View>
                  
                  <View style={styles.cinemaDetails}>
                    <Text style={styles.cinemaAddress}>
                      📍 {cinema.address}
                    </Text>
                    
                    {cinema.phone && (
                      <TouchableOpacity onPress={() => callPhone(cinema.phone)}>
                        <Text style={[styles.cinemaDetail, styles.clickableText]}>
                          📞 {cinema.phone} (Nhan de goi)
                        </Text>
                      </TouchableOpacity>
                    )}
                    
                    {cinema.facilities && (
                      <Text style={styles.cinemaDetail}>
                        🎬 Tien ich: {cinema.facilities}
                      </Text>
                    )}
                    
                    {cinema.totalScreens && (
                      <Text style={styles.cinemaDetail}>
                        🎭 So phong chieu: {cinema.totalScreens}
                      </Text>
                    )}
                    
                    {cinema.openingHours && (
                      <Text style={styles.cinemaDetail}>
                        🕒 Gio mo cua: {cinema.openingHours}
                      </Text>
                    )}
                    
                    {cinema.website && (
                      <TouchableOpacity onPress={() => openWebsite(cinema.website)}>
                        <Text style={[styles.cinemaDetail, styles.clickableText]}>
                          🌐 Website (Nhan de mo)
                        </Text>
                      </TouchableOpacity>
                    )}
                    
                    <Text style={styles.tapHint}>
                      Nhan card de xem chi duong tren Google Maps
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
      
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: {
    padding: 16,
    paddingTop: 20,
  },
  title: { 
    fontSize: 24, 
    fontWeight: "700", 
    marginBottom: 8, 
    textAlign: "center", 
    color: colors.primary 
  },
  locationWarning: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    color: "#FF9800",
    fontWeight: "600",
  },
  mapContainer: {
    height: 300,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  buttonGroup: { 
    paddingHorizontal: 24,
    marginTop: 10 
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  resultsContainer: {
    padding: 16,
  },
  cinemaListContainer: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  cinemaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cinemaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  cinemaNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    marginRight: 12,
    minWidth: 35,
    textAlign: 'center',
  },
  cinemaMainInfo: {
    flex: 1,
  },
  cinemaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    lineHeight: 24,
  },
  cinemaDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  cinemaDetails: {
    marginTop: 8,
  },
  cinemaAddress: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
    lineHeight: 20,
  },
  cinemaDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
  },
  mapIcon: {
    fontSize: 28,
    marginLeft: 8,
  },
  clickableText: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  tapHint: {
    fontSize: 12,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});
