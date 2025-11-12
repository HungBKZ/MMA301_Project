import React, { useEffect, useState, useCallback } from 'react';
import {
    FlatList,
    Image,
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Alert,
    Animated,
    Dimensions
} from 'react-native';
import { colors } from '../styles/commonStyles';
import { useAuth } from "../auth/AuthContext";
import {
    getWishlistByAccount,
    getMovieById,
    removeFromWishlistById
} from "../database/db";
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get('window');

export default function WishListScreen({ navigation }) {
    const { user } = useAuth();
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadWishlist = () => {
        if (!user) return;
        setLoading(true);
        try {
            const list = getWishlistByAccount(user.id)
                .map(item => {
                    const movie = getMovieById(item.movie_id);
                    return movie ? { ...movie, wishlistId: item.id } : null;
                })
                .filter(Boolean);
            setWishlist(list);
        } catch (error) {
            console.error('Error loading wishlist:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWishlist();
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            loadWishlist();
        }, [user])
    );

    const handleRemove = (wishlistId, movieId) => {
        Alert.alert(
            "Xóa khỏi Wishlist",
            "Bạn có chắc muốn xóa phim này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: () => {
                        removeFromWishlistById(wishlistId);
                        Alert.alert("Thành công", "Đã xóa khỏi wishlist");
                        loadWishlist();
                    }
                }
            ]
        );
    };

    const renderItem = ({ item, index }) => {
        return (
            <Animated.View
                style={[
                    styles.cardWrapper,
                    {
                        opacity: new Animated.Value(1),
                    }
                ]}
            >
                <TouchableOpacity
                    onPress={() => navigation.navigate("Detail", { movieId: item.id })}
                    style={styles.card}
                    activeOpacity={0.8}
                >
                    {/* POSTER CONTAINER */}
                    <View style={styles.posterContainer}>
                        {item.poster_uri ? (
                            <Image
                                source={{ uri: item.poster_uri }}
                                style={styles.poster}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={[styles.poster, styles.placeholder]}>
                                <Ionicons
                                    name="film"
                                    size={48}
                                    color={colors.accent}
                                />
                            </View>
                        )}

                        {/* STATUS BADGE */}
                        {item.status && (
                            <View style={[
                                styles.statusBadge,
                                item.status === 'SHOWING' ? styles.statusShowing : styles.statusComingSoon
                            ]}>
                                <Ionicons
                                    name={item.status === 'SHOWING' ? "play-circle" : "time"}
                                    size={12}
                                    color="#FFFFFF"
                                />
                                <Text style={styles.statusText}>
                                    {item.status === 'SHOWING' ? 'SHOWING' : 'COMING'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* INFO CONTAINER */}
                    <View style={styles.info}>
                        <View>
                            <Text style={styles.title} numberOfLines={2}>
                                {item.title}
                            </Text>
                            <Text style={styles.category} numberOfLines={1}>
                                {item.category}
                            </Text>
                        </View>

                        <View style={styles.footer}>
                            <View style={styles.yearContainer}>
                                <Ionicons name="calendar" size={13} color={colors.accent} />
                                <Text style={styles.year}>{item.release_year}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.durationBadge}
                            >
                                <Ionicons name="time" size={13} color={colors.textSecondary} />
                                <Text style={styles.durationText}>{item.duration_minutes || 120} min</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* DELETE BUTTON */}
                    <TouchableOpacity
                        onPress={(e) => {
                            e.stopPropagation();
                            handleRemove(item.wishlistId, item.movie_id);
                        }}
                        style={styles.deleteButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="trash-bin"
                            size={24}
                            color={colors.primary}
                        />
                    </TouchableOpacity>
                </TouchableOpacity>

                <View style={styles.divider} />
            </Animated.View>
        )
    }

    const EmptyStateComponent = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <Ionicons
                    name="heart-outline"
                    size={80}
                    color={colors.primary}
                />
            </View>
            <Text style={styles.emptyTitle}>Wishlist của bạn trống</Text>
            <Text style={styles.emptyDescription}>
                Thêm những bộ phim yêu thích của bạn để theo dõi và nhận thông báo khi chúng ra mắt
            </Text>
            <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => navigation.navigate("Home")}
                activeOpacity={0.85}
            >
                <Ionicons name="play-circle" size={20} color="#FFFFFF" />
                <Text style={styles.exploreButtonText}>Khám phá phim</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {wishlist.length === 0 ? (
                <EmptyStateComponent />
            ) : (
                <>
                    {/* HEADER */}
                    <View style={styles.header}>
                        <View style={styles.headerContent}>
                            <View>
                                <Text style={styles.headerGreeting}>My Wishlist</Text>
                            </View>
                        </View>
                        <View style={styles.countBadge}>
                            <Ionicons name="heart" size={16} color={colors.accent} />
                            <Text style={styles.countText}>{wishlist.length}</Text>
                        </View>
                    </View>

                    {/* LIST */}
                    <FlatList
                        data={wishlist}
                        keyExtractor={(item) => item.wishlistId.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={false}
                    />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // ==================== HEADER ====================
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },

    headerContent: {
        flex: 1,
    },

    headerGreeting: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 4,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },

    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },

    countBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surface,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.primary,
        elevation: 3,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },

    countText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.2,
    },

    // ==================== LIST ====================
    listContent: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        paddingBottom: 30,
    },

    cardWrapper: {
        marginVertical: 6,
    },

    card: {
        flexDirection: 'row',
        padding: 12,
        marginHorizontal: 4,
        backgroundColor: colors.surface,
        borderRadius: 14,
        alignItems: 'center',
        elevation: 4,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },

    // ==================== POSTER ====================
    posterContainer: {
        position: 'relative',
        marginRight: 14,
    },

    poster: {
        width: 90,
        height: 135,
        borderRadius: 12,
        backgroundColor: colors.backgroundAlt,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.primary,
    },

    placeholder: {
        justifyContent: 'center',
        alignItems: 'center'
    },

    statusBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderWidth: 1,
    },

    statusShowing: {
        borderColor: colors.primary,
    },

    statusComingSoon: {
        borderColor: colors.warning,
    },

    statusText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    // ==================== INFO ====================
    info: {
        flex: 1,
        justifyContent: 'space-between',
    },

    title: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 6,
        letterSpacing: 0.2,
    },

    category: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 8,
        fontWeight: '600',
    },

    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    yearContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: colors.backgroundAlt,
        borderRadius: 6,
    },

    year: {
        fontSize: 12,
        color: colors.accent,
        fontWeight: '700',
        letterSpacing: 0.1,
    },

    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: colors.backgroundAlt,
        borderRadius: 6,
    },

    durationText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },

    // ==================== DELETE BUTTON ====================
    deleteButton: {
        padding: 10,
        marginLeft: 8,
        borderRadius: 10,
        backgroundColor: 'rgba(211, 47, 47, 0.1)',
    },

    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: 12,
        marginTop: 6,
    },

    // ==================== EMPTY STATE ====================
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        backgroundColor: colors.background,
    },

    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.primary,
        marginBottom: 24,
        elevation: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },

    emptyTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: 0.3,
    },

    emptyDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
        fontWeight: '500',
    },

    exploreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.primary,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 12,
        elevation: 5,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },

    exploreButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
});

