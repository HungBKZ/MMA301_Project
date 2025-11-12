import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import { getAllMovies } from "../../database/db";
import { colors, commonStyles } from "../../styles/commonStyles";

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
      activeOpacity={0.85}
    >
      <Image
        source={item.poster_uri ? { uri: item.poster_uri } : require('../../../assets/icon.png')}
        style={styles.moviePoster}
        resizeMode="cover"
      />

      {/* Rank Badge */}
      <View style={styles.movieRank}>
        <Text style={styles.rankText}>{index + 1}</Text>
      </View>

      {/* Status Badge */}
      {item.status && (
        <View style={[
          styles.statusBadge,
          item.status === 'SHOWING' ? styles.statusShowing : styles.statusComingSoon
        ]}>
          <Ionicons
            name={item.status === 'SHOWING' ? "play-circle" : "time"}
            size={12}
            color="#FFFFFF"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.statusBadgeText}>
            {item.status === 'SHOWING' ? 'SHOWING' : 'COMING'}
          </Text>
        </View>
      )}

      {/* Hover Overlay */}
      <View style={styles.movieOverlay}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
        >
          <Ionicons name="ticket-sharp" size={20} color="#FFFFFF" />
          <Text style={styles.bookButtonText}>Chi tiết</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderFeaturedItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
      activeOpacity={0.9}
    >
      {/* Featured Poster */}
      <Image
        source={item.poster_uri ? { uri: item.poster_uri } : require('../../../assets/icon.png')}
        style={styles.featuredPoster}
        resizeMode="cover"
      />

      {/* Dark Overlay for better text readability */}
      <View style={styles.featuredGradientOverlay} />

      {/* Top Badges */}
      <View style={styles.featuredTopBadges}>
        <View style={styles.featuredRank}>
          <Text style={styles.featuredRankText}>{index + 1}</Text>
        </View>

        {item.status && (
          <View style={[
            styles.featuredStatusBadge,
            item.status === 'SHOWING' ? styles.statusShowingFeatured : styles.statusComingSoonFeatured
          ]}>
            <Ionicons
              name={item.status === 'SHOWING' ? "play-circle" : "time"}
              size={14}
              color="#FFFFFF"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.statusBadgeText}>
              {item.status === 'SHOWING' ? 'SHOWING' : 'COMING'}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Info */}
      <View style={styles.featuredInfo}>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color={colors.accent} />
          <Text style={styles.featuredRating}>4.5/5</Text>
        </View>
        <Text style={styles.featuredTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.featuredCategory}>{item.category}</Text>

        {item.status === 'SHOWING' && (
          <TouchableOpacity style={styles.bookNowButtonFeatured} onPress={() => navigation.navigate('Showtime', { movieId: item.id })}>
            <Ionicons name="ticket-sharp" size={16} color="#FFFFFF" />
            <Text style={styles.bookNowButtonText}>Mua vé ngay</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
    >
      {/* ==================== HEADER ==================== */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>🎬 Mua vé xem phim</Text>
          </View>

        </View>
      </View>

      {/* ==================== FEATURED MOVIES SECTION ==================== */}
      {featuredMovies.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="sparkles" size={20} color={colors.accent} />
            <Text style={styles.sectionTitle}>Phim nổi bật</Text>
          </View>
          <FlatList
            data={featuredMovies}
            renderItem={renderFeaturedItem}
            keyExtractor={(item) => `featured-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            snapToInterval={width * 0.75}
            decelerationRate="fast"
            scrollEventThrottle={16}
          />
        </View>
      )}

      {/* ==================== NOW SHOWING SECTION ==================== */}
      {nowShowingMovies.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="play-circle" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Đang chiếu</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('ListMovies', { status: 'SHOWING' })}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllText}>Xem tất cả</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={nowShowingMovies}
            renderItem={renderMovieCard}
            keyExtractor={(item) => `showing-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            scrollEventThrottle={16}
          />
        </View>
      )}

      {/* ==================== COMING SOON SECTION ==================== */}
      {movies.filter(m => m.status === 'COMING_SOON').length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="time" size={20} color={colors.warning} />
            <Text style={styles.sectionTitle}>Sắp ra mắt</Text>
          </View>
          <FlatList
            data={movies.filter(m => m.status === 'COMING_SOON').slice(0, 8)}
            renderItem={renderMovieCard}
            keyExtractor={(item) => `coming-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            scrollEventThrottle={16}
          />
        </View>
      )}

      {/* ==================== PROMOTIONS BANNER ==================== */}
      <View style={styles.promotionBanner}>
        <View style={styles.promotionContent}>
          <Ionicons name="gift" size={40} color={colors.accent} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.promotionTitle}>Ưu đãi độc quyền</Text>
            <Text style={styles.promotionSubtitle}>Giảm 30% vé xem phim hôm nay</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.accent} />
        </View>
      </View>

      {/* Bottom spacing */}
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
    paddingTop: 50,
    paddingBottom: 24,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  headerGreeting: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.3,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },

  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  // ==================== SECTION ====================
  section: {
    marginTop: 24,
    marginBottom: 8,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginLeft: 8,
    letterSpacing: 0.3,
  },

  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },

  seeAllText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
    marginRight: 4,
  },

  horizontalList: {
    paddingHorizontal: 12,
  },

  // ==================== FEATURED MOVIE CARD ====================
  featuredCard: {
    width: width * 0.7,
    marginHorizontal: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },

  featuredPoster: {
    width: '100%',
    height: width * 0.95,
    backgroundColor: colors.backgroundAlt,
  },

  featuredGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },

  featuredTopBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
  },

  featuredRank: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },

  featuredRankText: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.accent,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },

  featuredStatusBadge: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1.5,
  },

  statusShowingFeatured: {
    borderColor: colors.primary,
  },

  statusComingSoonFeatured: {
    borderColor: colors.warning,
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  featuredInfo: {
    padding: 14,
    backgroundColor: colors.surface,
  },

  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  featuredRating: {
    fontSize: 13,
    color: colors.accent,
    marginLeft: 4,
    fontWeight: '700',
  },

  featuredTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
    letterSpacing: 0.2,
  },

  featuredCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 10,
  },

  bookNowButtonFeatured: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },

  bookNowButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },

  // ==================== REGULAR MOVIE CARD ====================
  movieCard: {
    width: CARD_WIDTH,
    marginHorizontal: 6,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  moviePoster: {
    width: '100%',
    height: CARD_WIDTH * 1.5,
    backgroundColor: colors.backgroundAlt,
  },

  movieRank: {
    position: 'absolute',
    bottom: 12,
    left: 8,
    width: 45,
    height: 45,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },

  rankText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.accent,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1.5,
  },

  statusShowing: {
    borderColor: colors.primary,
  },

  statusComingSoon: {
    borderColor: colors.warning,
  },

  movieOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },

  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },

  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },

  // ==================== PROMOTION BANNER ====================
  promotionBanner: {
    marginHorizontal: 16,
    marginVertical: 24,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.accent,
    elevation: 5,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  promotionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  promotionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },

  promotionSubtitle: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 4,
  },
});

