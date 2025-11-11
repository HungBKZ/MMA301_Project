import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext';
import { addReview, getReviewsByMovie, updateReview, deleteReview } from '../database/db';
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
    KeyboardAvoidingView,
    Platform,
    TextInput,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/commonStyles';

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
    const [userReview, setUserReview] = useState(null);

    const loadReviews = useCallback(() => {
        setLoading(true);
        try {
            const data = getReviewsByMovie(movieId, true);
            setReviews(data);
            setReviewCount(data.length);
        } catch (error) {
            console.error('Error loading reviews:', error);
        } finally {
            setLoading(false);
        }
    }, [movieId]);

    const handleSubmitReview = () => {
        if (!reviewContent.trim()) {
            Alert.alert('Error', 'Please enter review content');
            return;
        }
        if (reviewContent.trim().length < 10) {
            Alert.alert('Error', 'Review must be at least 10 characters long');
            return;
        }
        setSubmitting(true);
        try {
            let result;
            if (editingReviewId) {
                result = updateReview(editingReviewId, reviewContent.trim());
                if (result.success) {
                    Alert.alert('Success', 'Update review successfully');
                }
            } else {
                result = addReview(movieId, user.id, reviewContent.trim());
                if (result.success) {
                    Alert.alert('Success', 'Submit review successfully');
                }
            }
            if (result.success) {
                setReviewContent('');
                setEditingReviewId(null);
                setModalVisible(false);
                loadReviews();
            } else {
                Alert.alert('Lỗi', result.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            Alert.alert('Lỗi', 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditReview = (review) => {
        try {
            if (user && review.user_id === user.id) {
                setReviewContent(review.content);
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

        return (
            <View style={styles.reviewCard}>
                <View style={styles.userSection}>
                    {item.avatar ? (
                        <Image
                            source={{ uri: item.avatar }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <MaterialCommunityIcons
                                name="account-circle"
                                size={40}
                                color={colors.border}
                            />
                        </View>
                    )}
                    <View style={styles.userInfo}>
                        <Text style={styles.username}>{item.name || 'Anonymous'}</Text>
                        <Text style={styles.createdAt}>{createdAt}</Text>
                    </View>
                    {myReview && (
                        <View style={styles.actionIcons}>
                            <TouchableOpacity
                                style={styles.iconButton}
                                onPress={() => handleEditReview(item)}
                            >
                                <MaterialCommunityIcons
                                    name="pencil"
                                    size={18}
                                    color={colors.primary}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.iconButton}
                                onPress={() => handleDeleteReview(item.id)}
                            >
                                <MaterialCommunityIcons
                                    name="trash-can"
                                    size={18}
                                    color="#F44336"
                                />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <Text style={styles.reviewContent}>{item.content}</Text>

            </View >
        );
    };

    const EmptyState = () => (
        <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="comment-outline" size={60} color={colors.border} />
            <Text style={styles.emptyTitle}>No review yet</Text>
            <Text style={styles.emptyDescription}>Be the first to review this movie</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Reviews ({reviewCount})</Text>
                {user && (
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setModalVisible(true)}
                    >
                        <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                        <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                )}
            </View>

            {reviews.length === 0 ? (
                <EmptyState />
            ) : (
                <FlatList
                    data={reviews}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"  // ✅ Sửa từ "slide" thành "fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlayContainer}>
                    {/* Overlay backdrop */}
                    <TouchableOpacity
                        style={styles.backdrop}
                        activeOpacity={1}
                        onPress={() => setModalVisible(false)}
                    />

                    {/* Modal centered */}
                    <View style={styles.centeredModalContent}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => {
                                setModalVisible(false);
                                setEditingReviewId(null);
                                setReviewContent('');
                            }}>
                                <MaterialCommunityIcons
                                    name="close"
                                    size={24}
                                    color={colors.text}
                                />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>
                                {editingReviewId ? 'Sửa đánh giá' : 'Viết đánh giá'}
                            </Text>
                            <View style={{ width: 24 }} />
                        </View>

                        {/* Input Area */}
                        <View style={styles.modalBody}>
                            <Text style={styles.label}>Nội dung đánh giá</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Chia sẻ cảm nhận của bạn về bộ phim này..."
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                numberOfLines={6}
                                value={reviewContent}
                                onChangeText={setReviewContent}
                                editable={!submitting}
                                textAlignVertical="top"
                            />
                            <Text style={styles.charCount}>
                                {reviewContent.length} / 500 ký tự
                            </Text>

                            <View style={styles.guidelineContainer}>
                                <MaterialCommunityIcons
                                    name="information-outline"
                                    size={16}
                                    color={colors.primary}
                                />
                                <Text style={styles.guidelineText}>
                                    Hãy viết đánh giá trung thực và có ích cho cộng đồng
                                </Text>
                            </View>
                        </View>

                        {/* Footer */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => {
                                    setModalVisible(false);
                                    setEditingReviewId(null);
                                    setReviewContent('');
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Hủy</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    styles.submitButton,
                                    (submitting || !reviewContent.trim()) && styles.submitButtonDisabled,
                                ]}
                                onPress={handleSubmitReview}
                                disabled={submitting || !reviewContent.trim()}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <MaterialCommunityIcons
                                            name={editingReviewId ? "pencil" : "send"}
                                            size={18}
                                            color="#fff"
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
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    addButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        gap: 6,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    reviewCard: {
        backgroundColor: '#e3e5e6ff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    avatarPlaceholder: {
        backgroundColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    createdAt: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    reviewContent: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginTop: 12,
        marginBottom: 4,
    },
    emptyDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end'
    },
    modalOverlayContainer: {
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    centeredModalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '85%',
        maxHeight: '80%',
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    modalBody: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        padding: 12,
        fontSize: 14,
        color: colors.text,
        marginBottom: 8,
        minHeight: 100,
    },
    charCount: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'right',
        marginBottom: 12,
    },
    guidelineContainer: {
        flexDirection: 'row',
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
        padding: 12,
        gap: 10,
    },
    guidelineText: {
        flex: 1,
        fontSize: 13,
        color: colors.primary,
        lineHeight: 18,
    },
    actionIcons: {
        flexDirection: 'row',
        gap: 12,
    },
    iconButton: {
        padding: 6,
        borderRadius: 8,
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        gap: 10,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    cancelButtonText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: colors.primary,
    },
    submitButtonDisabled: {
        backgroundColor: '#ccc',
        opacity: 0.6,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});