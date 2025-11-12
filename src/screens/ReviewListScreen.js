import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext';
import { addReview, getReviewsByMovie, updateReview, deleteReview, hideReview, unhideReview } from '../database/db';
import { useFocusEffect } from '@react-navigation/native';
import {
    FlatList,
    Image,
    Text,
    View,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Modal,
    ScrollView,
    TextInput,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, commonStyles } from '../styles/commonStyles';
import * as ImagePicker from 'expo-image-picker';

export default function ReviewListScreen({ route, navigation }) {
    const { movieId } = route.params;
    const { user } = useAuth();

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reviewCount, setReviewCount] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [reviewContent, setReviewContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [rating, setRating] = useState(5);

    const loadReviews = useCallback(() => {
        setLoading(true);
        try {
            const isAdmin = user && (user.role === 'admin' || user.role === 'Admin');
            const data = getReviewsByMovie(movieId, isAdmin);
            setReviews(data);
            const visibleCount = isAdmin ? data.length : data.filter(r => !r.hidden).length;
            setReviewCount(visibleCount);
        } catch (error) {
            console.error('Error loading reviews:', error);
        } finally {
            setLoading(false);
        }
    }, [movieId, user]);

    const handleSubmitReview = () => {
        if (!reviewContent.trim()) {
            Alert.alert('Error', 'Please enter review content');
            return;
        }

        setSubmitting(true);
        try {
            let result;
            if (editingReviewId) {
                result = updateReview(editingReviewId, reviewContent.trim(), selectedImage);
                if (result.success) {
                    Alert.alert('Success', 'Review updated successfully');
                }
            } else {
                result = addReview(movieId, user.id, reviewContent.trim(), selectedImage);
                if (result.success) {
                    Alert.alert('Success', 'Review submitted successfully');
                }
            }
            if (result.success) {
                setReviewContent('');
                setSelectedImage(null);
                setEditingReviewId(null);
                setRating(5);
                setModalVisible(false);
                loadReviews();
            } else {
                Alert.alert('Error', result.message || 'An error occurred');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            Alert.alert('Error', 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Please allow photo access!');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });
        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    const removeImage = () => {
        setSelectedImage(null);
    };

    const handleEditReview = (review) => {
        try {
            if (user && review.user_id === user.id) {
                setReviewContent(review.content);
                setSelectedImage(review.image || null);
                setEditingReviewId(review.id);
                setModalVisible(true);
            }
            else {
                Alert.alert("Error", "You can only edit your own reviews.");
            }
        } catch (error) {
            console.error('Error editing review:', error);
        }
    }

    const handleDeleteReview = (reviewId) => {
        Alert.alert(
            "Delete Review",
            "Are you sure you want to delete this review?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        deleteReview(reviewId);
                        Alert.alert("Success", "Review deleted");
                        loadReviews();
                    }
                }
            ]
        );
    }

    const handleHideReview = (review) => {
        const isHidden = review.hidden === 1;
        const action = isHidden ? unhideReview : hideReview;
        const actionText = isHidden ? 'unhide' : 'hide';

        Alert.alert(
            isHidden ? "Unhide Review" : "Hide Review",
            `Are you sure you want to ${actionText} this review?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: isHidden ? "Unhide" : "Hide",
                    style: isHidden ? "default" : "destructive",
                    onPress: () => {
                        const result = action(review.id);
                        if (result.success) {
                            Alert.alert("Success", `Review has been ${actionText}`);
                            loadReviews();
                        } else {
                            Alert.alert("Error", "An error occurred");
                        }
                    }
                }
            ]
        );
    }

    useEffect(() => {
        loadReviews();
    }, [loadReviews]);

    useFocusEffect(
        useCallback(() => {
            loadReviews();
        }, [loadReviews])
    );

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadReviews();
        setRefreshing(false);
    }, [loadReviews]);

    const renderItem = ({ item }) => {
        const createdAt = new Date(item.created_at).toLocaleDateString('vi-VN');
        const myReview = user && item.user_id === user.id;
        const isAdmin = user && (user.role === 'admin' || user.role === 'Admin');
        const isHidden = item.hidden === 1;

        return (
            <View style={[styles.reviewCard, isHidden && isAdmin && styles.hiddenReviewCard]}>
                {/* Review Header */}
                <View style={styles.reviewHeader}>
                    <View style={styles.userSection}>
                        {item.avatar_uri ? (
                            <Image
                                source={{ uri: item.avatar_uri }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Ionicons name="person-circle" size={40} color={colors.accent} />
                            </View>
                        )}
                        <View style={styles.userInfo}>
                            <View style={styles.userNameRow}>
                                <Text style={styles.username}>{item.name}</Text>
                                {myReview && (
                                    <View style={styles.myReviewBadge}>
                                        <Text style={styles.myReviewText}>You</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.createdAt}>{createdAt}</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionIcons}>
                        {myReview && (
                            <>
                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={() => handleEditReview(item)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="pencil" size={18} color={colors.accent} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={() => handleDeleteReview(item.id)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="trash" size={18} color={colors.error} />
                                </TouchableOpacity>
                            </>
                        )}
                        {isAdmin && (
                            <TouchableOpacity
                                style={styles.iconButton}
                                onPress={() => handleHideReview(item)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={isHidden ? "eye" : "eye-off"}
                                    size={18}
                                    color={isHidden ? colors.success : colors.warning}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Hidden Badge */}
                {isHidden && isAdmin && (
                    <View style={styles.hiddenIndicator}>
                        <Ionicons name="eye-off" size={12} color={colors.warning} />
                        <Text style={styles.hiddenIndicatorText}>Hidden by Admin</Text>
                    </View>
                )}

                {/* Review Content */}
                <Text style={[styles.reviewContent, isHidden && isAdmin && styles.hiddenReviewContent]}>
                    {item.content}
                </Text>

                {/* Review Image */}
                {item.image && (
                    <View style={styles.reviewImageContainer}>
                        <Image
                            source={{ uri: item.image }}
                            style={styles.reviewImage}
                            onError={(error) => {
                                console.log("Image load error:", error);
                            }}
                        />
                    </View>
                )}
            </View>
        );
    };

    const EmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có đánh giá</Text>
            <Text style={styles.emptyDescription}>
                Hãy là người đầu tiên chia sẻ cảm nhận về phim này
            </Text>
            {user && (
                <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => {
                        setReviewContent('');
                        setSelectedImage(null);
                        setEditingReviewId(null);
                        setRating(5);
                        setModalVisible(true);
                    }}
                >
                    <Ionicons name="pencil" size={18} color="#FFFFFF" />
                    <Text style={styles.emptyButtonText}>Viết đánh giá</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* ==================== HEADER ==================== */}
            <View style={styles.headerBar}>
                <View style={styles.headerContent}>
                    <Ionicons name="chatbubbles" size={24} color={colors.primary} />
                    <View>
                        <Text style={styles.headerSubtitle}>Đánh giá từ khán giả</Text>
                        <Text style={styles.headerTitle}>Reviews</Text>
                    </View>
                </View>
                <View style={styles.reviewCountBadge}>
                    <Ionicons name="layers" size={14} color={colors.accent} />
                    <Text style={styles.reviewCountText}>{reviewCount}</Text>
                </View>
            </View>

            {/* ==================== REVIEWS LIST ==================== */}
            {reviews.length === 0 ? (
                <EmptyState />
            ) : (
                <FlatList
                    data={reviews}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                        />
                    }
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Add Button */}
            {user && reviews.length > 0 && (
                <TouchableOpacity
                    style={styles.floatingButton}
                    onPress={() => {
                        setReviewContent('');
                        setSelectedImage(null);
                        setEditingReviewId(null);
                        setRating(5);
                        setModalVisible(true);
                    }}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                </TouchableOpacity>
            )}

            {/* ==================== ADD/EDIT REVIEW MODAL ==================== */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.backdrop}
                        activeOpacity={1}
                        onPress={() => setModalVisible(false)}
                    />

                    <View style={styles.modalContent}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalSubtitle}>
                                    {editingReviewId ? '✏️ Chỉnh sửa' : '✍️ Viết đánh giá'}
                                </Text>
                                <Text style={styles.modalTitle}>
                                    {editingReviewId ? 'Edit Review' : 'New Review'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    setModalVisible(false);
                                    setEditingReviewId(null);
                                    setReviewContent('');
                                    setSelectedImage(null);
                                    setRating(5);
                                }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalBody}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Rating Section */}
                            <View style={styles.ratingSection}>
                                <Text style={styles.inputLabel}>Xếp hạng</Text>
                                <View style={styles.ratingContainer}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <TouchableOpacity
                                            key={star}
                                            onPress={() => setRating(star)}
                                            style={styles.starButton}
                                        >
                                            <Ionicons
                                                name={star <= rating ? "star" : "star-outline"}
                                                size={32}
                                                color={star <= rating ? colors.accent : colors.textSecondary}
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={styles.ratingText}>{rating}/5 ⭐</Text>
                            </View>

                            {/* Content Input */}
                            <View style={styles.inputSection}>
                                <Text style={styles.inputLabel}>Nội dung đánh giá</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Chia sẻ cảm nhận của bạn về phim..."
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    numberOfLines={5}
                                    value={reviewContent}
                                    onChangeText={setReviewContent}
                                    editable={!submitting}
                                    textAlignVertical="top"
                                />
                                <Text style={styles.charCount}>
                                    {reviewContent.length} / 500 ký tự
                                </Text>
                            </View>

                            {/* Image Section */}
                            <View style={styles.imageSection}>
                                <Text style={styles.inputLabel}>Thêm ảnh (Tùy chọn)</Text>
                                <TouchableOpacity
                                    style={styles.imagePickerButton}
                                    onPress={pickImage}
                                    disabled={submitting}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="image-outline" size={28} color={colors.primary} />
                                    <View style={styles.imagePickerContent}>
                                        <Text style={styles.imagePickerTitle}>Chọn ảnh từ thư viện</Text>
                                        <Text style={styles.imagePickerSubtitle}>
                                            Tăng cường đánh giá của bạn với ảnh minh họa
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                {/* Image Preview */}
                                {selectedImage && (
                                    <View style={styles.imagePreviewSection}>
                                        <Text style={styles.previewLabel}>Ảnh đã chọn</Text>
                                        <View style={styles.imagePreviewContainer}>
                                            <Image
                                                source={{ uri: selectedImage }}
                                                style={styles.imagePreview}
                                            />
                                            <TouchableOpacity
                                                style={styles.removeImageButton}
                                                onPress={removeImage}
                                            >
                                                <Ionicons name="close-circle" size={28} color={colors.error} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Guidelines */}
                            <View style={styles.guidelineContainer}>
                                <Ionicons name="bulb-outline" size={20} color={colors.accent} />
                                <View style={styles.guidelineContent}>
                                    <Text style={styles.guidelineTitle}>Mẹo viết đánh giá tốt</Text>
                                    <Text style={styles.guidelineText}>
                                        • Trung thực với cảm nhận của bạn{'\n'}
                                        • Nêu rõ điểm mạnh và yếu{'\n'}
                                        • Tránh spoiler{'\n'}
                                        • Kiểm tra lỗi chính tả trước khi gửi
                                    </Text>
                                </View>
                            </View>

                            <View style={{ height: 16 }} />
                        </ScrollView>

                        {/* Modal Footer */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.footerButton, styles.cancelButton]}
                                onPress={() => {
                                    setModalVisible(false);
                                    setEditingReviewId(null);
                                    setReviewContent('');
                                    setSelectedImage(null);
                                    setRating(5);
                                }}
                                disabled={submitting}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.cancelButtonText}>Hủy</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.footerButton,
                                    styles.submitButton,
                                    (submitting || !reviewContent.trim()) && styles.submitButtonDisabled,
                                ]}
                                onPress={handleSubmitReview}
                                disabled={submitting || !reviewContent.trim()}
                                activeOpacity={0.85}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <>
                                        <Ionicons
                                            name={editingReviewId ? "pencil" : "send"}
                                            size={18}
                                            color="#FFFFFF"
                                        />
                                        <Text style={styles.submitButtonText}>
                                            {editingReviewId ? 'Cập nhật' : 'Gửi'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    loadingText: {
        fontSize: 14,
        color: colors.textPrimary,
        marginTop: 12,
        fontWeight: '600',
    },

    // ==================== HEADER ====================
    headerBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginTop: 8,
    },

    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },

    headerSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },

    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: 0.3,
    },

    reviewCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.primary,
        elevation: 2,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
    },

    reviewCountText: {
        color: colors.accent,
        fontWeight: '800',
        fontSize: 12,
        letterSpacing: 0.2,
    },

    // ==================== LIST CONTENT ====================
    listContent: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        paddingBottom: 80,
    },

    // ==================== REVIEW CARD ====================
    reviewCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 3,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
    },

    hiddenReviewCard: {
        backgroundColor: 'rgba(255, 167, 38, 0.08)',
        borderLeftWidth: 3,
        borderLeftColor: colors.warning,
    },

    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },

    userSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: colors.primary,
    },

    avatarPlaceholder: {
        backgroundColor: colors.backgroundAlt,
        justifyContent: 'center',
        alignItems: 'center',
    },

    userInfo: {
        flex: 1,
    },

    userNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },

    username: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: 0.2,
    },

    myReviewBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },

    myReviewText: {
        fontSize: 11,
        color: '#FFFFFF',
        fontWeight: '700',
    },

    createdAt: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },

    actionIcons: {
        flexDirection: 'row',
        gap: 6,
    },

    iconButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.backgroundAlt,
    },

    hiddenIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 167, 38, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        marginBottom: 10,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: colors.warning,
    },

    hiddenIndicatorText: {
        fontSize: 11,
        color: colors.warning,
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    reviewContent: {
        fontSize: 14,
        color: colors.textPrimary,
        lineHeight: 21,
        marginBottom: 10,
        fontWeight: '500',
    },

    hiddenReviewContent: {
        opacity: 0.5,
        fontStyle: 'italic',
        color: colors.textSecondary,
    },

    reviewImageContainer: {
        marginTop: 10,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },

    reviewImage: {
        width: '100%',
        height: 180,
        resizeMode: 'cover',
        backgroundColor: colors.backgroundAlt,
    },

    // ==================== EMPTY STATE ====================
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },

    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.primary,
        marginBottom: 20,
    },

    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 8,
        letterSpacing: 0.3,
    },

    emptyDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },

    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
        elevation: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },

    emptyButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    // ==================== FLOATING BUTTON ====================
    floatingButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },

    // ==================== MODAL ====================
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },

    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        width: '90%',
        maxHeight: '85%',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        zIndex: 10,
        elevation: 8,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },

    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },

    modalSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 4,
    },

    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: 0.2,
    },

    modalBody: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },

    // ==================== RATING SECTION ====================
    ratingSection: {
        marginBottom: 24,
    },

    ratingContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginVertical: 14,
    },

    starButton: {
        padding: 8,
    },

    ratingText: {
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '700',
        color: colors.accent,
        marginTop: 8,
    },

    // ==================== INPUT SECTION ====================
    inputSection: {
        marginBottom: 20,
    },

    inputLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 10,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },

    textInput: {
        backgroundColor: colors.backgroundAlt,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.textPrimary,
        minHeight: 100,
        textAlignVertical: 'top',
    },

    charCount: {
        fontSize: 11,
        color: colors.textSecondary,
        textAlign: 'right',
        marginTop: 6,
        fontWeight: '600',
    },

    // ==================== IMAGE SECTION ====================
    imageSection: {
        marginBottom: 16,
    },

    imagePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundAlt,
        borderWidth: 2,
        borderRadius: 10,
        padding: 14,
        gap: 12,
        borderColor: colors.primary,
    },

    imagePickerContent: {
        flex: 1,
    },

    imagePickerTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 2,
        letterSpacing: 0.2,
    },

    imagePickerSubtitle: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
    },

    imagePreviewSection: {
        marginTop: 12,
    },

    previewLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 8,
        letterSpacing: 0.2,
    },

    imagePreviewContainer: {
        position: 'relative',
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },

    imagePreview: {
        width: '100%',
        height: 160,
        resizeMode: 'cover',
        backgroundColor: colors.backgroundAlt,
    },

    removeImageButton: {
        position: 'absolute',
        top: 8,
        right: 8,
    },

    // ==================== GUIDELINES ====================
    guidelineContainer: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: colors.backgroundAlt,
        borderLeftWidth: 3,
        borderLeftColor: colors.accent,
        borderRadius: 8,
        padding: 12,
    },

    guidelineContent: {
        flex: 1,
    },

    guidelineTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 6,
        letterSpacing: 0.2,
    },

    guidelineText: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 16,
        fontWeight: '500',
    },

    // ==================== MODAL FOOTER ====================
    modalFooter: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },

    footerButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },

    cancelButton: {
        backgroundColor: colors.backgroundAlt,
        borderWidth: 1,
        borderColor: colors.border,
    },

    cancelButtonText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.2,
    },

    submitButton: {
        backgroundColor: colors.primary,
        elevation: 3,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },

    submitButtonDisabled: {
        backgroundColor: colors.textSecondary,
        opacity: 0.6,
    },

    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
});

