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
                    activeOpacity={0.75}
                >
                    <View style={styles.posterContainer}>
                        {item.poster_uri ? (
                            <Image
                                source={{ uri: item.poster_uri }}
                                style={styles.poster}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={[styles.poster, styles.placeholder]}>
                                <MaterialCommunityIcons
                                    name="film"
                                    size={48}
                                    color={colors.textSecondary}
                                />
                            </View>
                        )}
                    </View>

                    <View style={styles.info}>
                        <Text style={styles.title} numberOfLines={2}>
                            {item.title}
                        </Text>
                        <Text style={styles.category} numberOfLines={1}>
                            {item.category}
                        </Text>
                        <View style={styles.yearContainer}>
                            <Text style={styles.year}>Year:{item.release_year}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={(e) => {
                            e.stopPropagation();
                            handleRemove(item.wishlistId, item.movie_id);
                        }}
                        style={styles.deleteButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MaterialCommunityIcons
                            name="trash-can-outline"
                            size={24}
                            color={colors.error}
                        />
                    </TouchableOpacity>
                </TouchableOpacity>

                <View style={styles.divider} />
            </Animated.View>
        )
    }

    const EmptyStateComponent = () => (
        <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
                name="heart-outline"
                size={80}
                color={colors.border}
            />
            <Text style={styles.emptyTitle}>Wishlist của bạn trống</Text>
            <Text style={styles.emptyDescription}>
                Thêm phim yêu thích của bạn để theo dõi sau
            </Text>
            <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => navigation.navigate("Home")}
            >
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
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            My Wishlist
                        </Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{wishlist.length}</Text>
                        </View>
                    </View>
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
        backgroundColor: '#f8f9fa'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
    },
    countBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    countText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 12,
        paddingBottom: 20,
    },
    cardWrapper: {
        marginVertical: 6,
    },
    card: {
        flexDirection: 'row',
        padding: 12,
        marginHorizontal: 4,
        backgroundColor: colors.surface,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    posterContainer: {
        position: 'relative',
        marginRight: 12,
    },
    poster: {
        width: 90,
        height: 135,
        borderRadius: 12,
        backgroundColor: colors.border,
        overflow: 'hidden',
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    ratingBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        color: '#FFD700',
        fontSize: 12,
        fontWeight: '600',
    },
    info: {
        flex: 1,
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 6,
    },
    category: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    yearContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    year: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    deleteButton: {
        padding: 12,
        marginLeft: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginHorizontal: 12,
        marginTop: 6,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginTop: 20,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 20,
    },
    exploreButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 12,
    },
    exploreButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});