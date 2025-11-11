import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, FlatList } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { getAllMovies } from "../../database/db";
import { colors } from "../../styles/commonStyles";

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.42;

export default function UserHomeScreen({ navigation }) {
  const { user } = useAuth();
  const [movies, setMovies] = useState([]);
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [nowShowingMovies, setNowShowingMovies] = useState([]);

  useEffect(() => {
    loadMovies();
  }, []);

  const loadMovies = () => {
    try {
      const allMovies = getAllMovies();
      setMovies(allMovies);
      
      // Phim nổi bật (featured) - lấy phim có rating cao hoặc mới nhất
      const featured = allMovies
        .filter(m => m.status === 'SHOWING' || m.status === 'COMING_SOON')
        .slice(0, 5);
      setFeaturedMovies(featured);
      
      // Phim hay đang chiếu
      const showing = allMovies.filter(m => m.status === 'SHOWING').slice(0, 10);
      setNowShowingMovies(showing);
    } catch (error) {
      console.error("Error loading movies:", error);
    }
  };

  const renderMovieCard = ({ item, index }) => (
    <TouchableOpacity
      style={styles.movieCard}
      onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
    >
      <Image
        source={item.poster_uri ? { uri: item.poster_uri } : require('../../../assets/icon.png')}
        style={styles.moviePoster}
        resizeMode="cover"
      />
      <View style={styles.movieRank}>
        <Text style={styles.rankText}>{index + 1}</Text>
      </View>
      {item.status && (
        <View style={styles.ageBadge}>
          <Text style={styles.ageBadgeText}>
            {item.status === 'SHOWING' ? '13+' : item.status === 'COMING_SOON' ? '16+' : '18+'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFeaturedItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
    >
      <Image
        source={item.poster_uri ? { uri: item.poster_uri } : require('../../../assets/icon.png')}
        style={styles.featuredPoster}
        resizeMode="cover"
      />
      <View style={styles.featuredOverlay}>
        <View style={styles.featuredRank}>
          <Text style={styles.featuredRankText}>{index + 1}</Text>
        </View>
        {item.status && (
          <View style={styles.featuredAgeBadge}>
            <Text style={styles.ageBadgeText}>
              {item.status === 'SHOWING' ? '13+' : '16+'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.featuredInfo}>
        <Text style={styles.featuredRating}>⭐ 10/10</Text>
        <Text style={styles.featuredTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.featuredCategory}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mua ve xem phim</Text>
      </View>

      {/* Featured Movies Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phim noi bat</Text>
        <FlatList
          data={featuredMovies}
          renderItem={renderFeaturedItem}
          keyExtractor={(item) => `featured-${item.id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          snapToInterval={width * 0.75}
          decelerationRate="fast"
        />
      </View>

      {/* Now Showing Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Phim hay dang chieu</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Search')}>
            <Text style={styles.seeAllText}>Xem tat ca ›</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={nowShowingMovies}
          renderItem={renderMovieCard}
          keyExtractor={(item) => `showing-${item.id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      </View>

      {/* Bottom spacing */}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF'
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  section: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  horizontalList: {
    paddingHorizontal: 12,
  },
  // Featured Movie Card (Large)
  featuredCard: {
    width: width * 0.7,
    marginHorizontal: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  featuredPoster: {
    width: '100%',
    height: width * 0.95,
    backgroundColor: '#2a2a2a',
  },
  featuredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  featuredRank: {
    fontSize: 80,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    position: 'absolute',
    bottom: 100,
    left: 20,
  },
  featuredRankText: {
    fontSize: 80,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  featuredAgeBadge: {
    backgroundColor: 'rgba(255, 87, 51, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  featuredInfo: {
    padding: 12,
    backgroundColor: '#1a1a1a',
  },
  featuredRating: {
    fontSize: 14,
    color: '#FFA500',
    marginBottom: 4,
    fontWeight: '600',
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featuredCategory: {
    fontSize: 13,
    color: '#999999',
  },
  // Regular Movie Card
  movieCard: {
    width: CARD_WIDTH,
    marginHorizontal: 6,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  moviePoster: {
    width: '100%',
    height: CARD_WIDTH * 1.4,
    backgroundColor: '#e0e0e0',
  },
  movieRank: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  ageBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 87, 51, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ageBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});