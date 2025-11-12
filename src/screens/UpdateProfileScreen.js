import React, { useState, useEffect } from "react";
import {
    ScrollView,
    View,
    TextInput,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Image,
    Alert,
    SafeAreaView,
    KeyboardAvoidingView,
} from "react-native";
import { colors, commonStyles } from "../styles/commonStyles";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { getUserById, getUserByEmail, updateUserProfile } from "../database/accountDB";
import { useAuth } from "../auth/AuthContext";

export default function UpdateProfileScreen({ navigation, route }) {
    const { userId, email } = route?.params || {};
    const { user: authUser, login } = useAuth();
    const [initLoading, setInitLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);

    // Form state
    const [name, setName] = useState("");
    const [avatarUri, setAvatarUri] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [gender, setGender] = useState("");
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const resolvedId = userId || authUser?.id;
                const resolvedEmail = email || authUser?.email;

                let user = null;
                if (resolvedId) {
                    user = getUserById(resolvedId);
                } else if (resolvedEmail) {
                    user = getUserByEmail(resolvedEmail);
                }

                if (!user) {
                    Alert.alert("Lỗi", "Không tìm thấy tài khoản để cập nhật.", [
                        { text: "OK", onPress: () => navigation.goBack() },
                    ]);
                    return;
                }

                setName(user.name || "");
                setAvatarUri(user.avatar_uri || "");
                setUserEmail(user.email || "");
                setPhone(user.phone || "");
                setDateOfBirth(user.date_of_birth || "");
                setGender(user.gender || "");
            } catch (e) {
                Alert.alert("Lỗi", "Không thể tải dữ liệu tài khoản.");
            } finally {
                await ImagePicker.requestMediaLibraryPermissionsAsync();
                setInitLoading(false);
            }
        })();
    }, [userId, email, authUser]);

    const pickImage = async () => {
        try {
            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.6,
                allowsEditing: true,
                aspect: [1, 1],
            });
            if (!res.canceled && res.assets && res.assets[0]?.uri) {
                setAvatarUri(res.assets[0].uri);
            }
        } catch (e) { }
    };

    const clearAvatar = () => setAvatarUri("");

    const onChangeDate = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === "ios");
        if (selectedDate) {
            const yyyy = selectedDate.getFullYear();
            const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
            const dd = String(selectedDate.getDate()).padStart(2, "0");
            setDateOfBirth(`${yyyy}-${mm}-${dd}`);
        }
    };

    const isPhoneValid = (ph) => /^0\d{9}$/.test(ph);
    const isDobValid = (dob) => {
        const d = new Date(dob);
        if (isNaN(d.getTime())) return false;
        const today = new Date();
        const age = today.getFullYear() - d.getFullYear() - (today < new Date(d.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
        return age >= 13 && d < today;
    };

    const onUpdate = async () => {
        setErr(null);
        setLoading(true);
        try {
            const resolvedId = userId || authUser?.id;
            if (!resolvedId) {
                setErr("Không xác định được tài khoản để cập nhật.");
                setLoading(false);
                return;
            }

            const existing = getUserById(resolvedId) || {};
            const finalPhone = phone && phone.trim() ? phone.trim() : (existing.phone || "");
            const finalDob = dateOfBirth && dateOfBirth.trim() ? dateOfBirth.trim() : (existing.date_of_birth || "");
            const finalGender = gender && gender !== "" ? gender : (existing.gender || "");

            if (!finalPhone || !finalDob || !finalGender) {
                setErr("Vui lòng nhập số điện thoại, ngày sinh và giới tính.");
                setLoading(false);
                return;
            }

            if (!isPhoneValid(finalPhone)) {
                setErr("Số điện thoại phải có 10 chữ số và bắt đầu bằng 0.");
                setLoading(false);
                return;
            }
            if (!isDobValid(finalDob)) {
                setErr("Ngày sinh không hợp lệ hoặc dưới 13 tuổi.");
                setLoading(false);
                return;
            }

            const ok = updateUserProfile(resolvedId, {
                name: name.trim(),
                avatar_uri: avatarUri || null,
                phone: finalPhone,
                date_of_birth: finalDob,
                gender: finalGender,
            });

            if (ok) {
                try {
                    const fresh = getUserById(resolvedId);
                    if (fresh) {
                        await login({
                            id: fresh.id,
                            email: fresh.email,
                            role: fresh.role,
                            phone: fresh.phone,
                            date_of_birth: fresh.date_of_birth,
                            gender: fresh.gender,
                            name: fresh.name,
                        });
                    }
                } catch (e) { }
                Alert.alert("Thành công", "Cập nhật tài khoản thành công!", [
                    { text: "OK", onPress: () => navigation.goBack() },
                ]);
            } else {
                setErr("Cập nhật thất bại.");
            }
        } catch (e) {
            console.error("UpdateProfile error:", e);
            setErr("Lỗi khi cập nhật.");
        } finally {
            setLoading(false);
        }
    };

    if (initLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ==================== HEADER ==================== */}
                    <View style={styles.headerContainer}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={24} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Cập nhật hồ sơ</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* ==================== ERROR MESSAGE ==================== */}
                    {err && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={20} color={colors.error} />
                            <Text style={styles.errorText}>{err}</Text>
                        </View>
                    )}

                    {/* ==================== AVATAR & NAME SECTION ==================== */}
                    <View style={styles.profileHeaderCard}>
                        <View style={styles.avatarRow}>
                            <TouchableOpacity
                                style={styles.avatarBox}
                                onPress={pickImage}
                                activeOpacity={0.8}
                            >
                                {avatarUri ? (
                                    <>
                                        <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                                        <TouchableOpacity
                                            style={styles.clearAvatarButton}
                                            onPress={clearAvatar}
                                            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                                        >
                                            <Ionicons name="close-circle" size={24} color={colors.error} />
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Ionicons name="camera" size={32} color={colors.accent} />
                                        <Text style={styles.avatarText}>Đổi ảnh</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <View style={styles.profileInfoColumn}>
                                <View style={styles.inputGroupSmall}>
                                    <Text style={styles.inputLabel}>Họ tên</Text>
                                    <View style={styles.inputWrapperSmall}>
                                        <Ionicons name="person" size={18} color={colors.accent} style={styles.inputIcon} />
                                        <TextInput
                                            placeholder="Nhập họ tên"
                                            value={name}
                                            onChangeText={setName}
                                            style={styles.inputFieldSmall}
                                            placeholderTextColor={colors.textSecondary}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroupSmall}>
                                    <Text style={styles.inputLabel}>Email</Text>
                                    <View style={[styles.inputWrapperSmall, styles.inputWrapperDisabled]}>
                                        <Ionicons name="mail" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                        <TextInput
                                            placeholder="Email"
                                            value={userEmail}
                                            editable={false}
                                            style={[styles.inputFieldSmall, { color: colors.textSecondary }]}
                                            placeholderTextColor={colors.textSecondary}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* ==================== CONTACT INFO SECTION ==================== */}
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>

                        <View style={styles.rowContainer}>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.inputLabel}>Số điện thoại *</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="call" size={18} color={colors.accent} style={styles.inputIcon} />
                                    <TextInput
                                        placeholder="0xxxxxxxxx"
                                        value={phone}
                                        onChangeText={setPhone}
                                        style={styles.inputField}
                                        keyboardType="phone-pad"
                                        placeholderTextColor={colors.textSecondary}
                                    />
                                </View>
                            </View>

                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.inputLabel}>Ngày sinh *</Text>
                                <TouchableOpacity
                                    style={styles.inputWrapper}
                                    onPress={() => setShowDatePicker(true)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="calendar" size={18} color={colors.accent} style={styles.inputIcon} />
                                    <Text
                                        style={[
                                            styles.inputField,
                                            { color: dateOfBirth ? colors.textPrimary : colors.textSecondary },
                                        ]}
                                    >
                                        {dateOfBirth || "Chọn ngày"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                value={dateOfBirth ? new Date(dateOfBirth) : new Date(new Date().getFullYear() - 20, 0, 1)}
                                mode="date"
                                display="default"
                                maximumDate={new Date()}
                                onChange={onChangeDate}
                            />
                        )}

                        {/* Gender */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Giới tính *</Text>
                            <View style={styles.pickerWrapper}>
                                <Ionicons name="people" size={18} color={colors.accent} style={styles.inputIcon} />
                                <Picker
                                    selectedValue={gender}
                                    onValueChange={(value) => setGender(value)}
                                    mode="dropdown"
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Chọn giới tính..." value="" />
                                    <Picker.Item label="Nam" value="male" />
                                    <Picker.Item label="Nữ" value="female" />
                                    <Picker.Item label="Khác" value="other" />
                                </Picker>
                            </View>
                        </View>
                    </View>

                    {/* ==================== INFO CARD ==================== */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Ionicons name="shield-checkmark" size={18} color={colors.accent} />
                            <Text style={styles.infoText}>
                                Các trường có dấu <Text style={{ color: colors.primary }}>*</Text> là bắt buộc
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="information-circle" size={18} color={colors.accent} />
                            <Text style={styles.infoText}>
                                Email không thể thay đổi vì lý do bảo mật
                            </Text>
                        </View>
                    </View>

                    {/* ==================== ACTION BUTTONS ==================== */}
                    <TouchableOpacity
                        style={[styles.updateButton, loading && styles.buttonDisabled]}
                        onPress={onUpdate}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" />
                                <Text style={styles.updateButtonText}>Cập nhật hồ sơ</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="arrow-back" size={18} color={colors.primary} />
                        <Text style={styles.cancelButtonText}>Quay lại</Text>
                    </TouchableOpacity>

                    <View style={{ height: 30 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },

    keyboardView: {
        flex: 1,
    },

    container: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        backgroundColor: colors.background,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
    },

    loadingText: {
        fontSize: 14,
        color: colors.textPrimary,
        marginTop: 12,
        fontWeight: "600",
    },

    // ==================== HEADER ====================
    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },

    backButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 10,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },

    headerTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: colors.textPrimary,
        letterSpacing: 0.3,
    },

    // ==================== ERROR MESSAGE ====================
    errorContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(239, 83, 80, 0.1)",
        borderLeftWidth: 3,
        borderLeftColor: colors.error,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: "rgba(239, 83, 80, 0.2)",
    },

    errorText: {
        flex: 1,
        fontSize: 13,
        color: colors.error,
        fontWeight: "600",
    },

    // ==================== PROFILE HEADER CARD ====================
    profileHeaderCard: {
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 3,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
    },

    avatarRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
    },

    avatarBox: {
        width: 100,
        height: 100,
        borderRadius: 12,
        backgroundColor: colors.backgroundAlt,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: colors.primary,
        overflow: "hidden",
        elevation: 2,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
    },

    avatarImg: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },

    avatarPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
    },

    avatarText: {
        fontSize: 12,
        color: colors.accent,
        marginTop: 6,
        fontWeight: "700",
    },

    clearAvatarButton: {
        position: "absolute",
        top: 4,
        right: 4,
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 2,
        elevation: 3,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },

    profileInfoColumn: {
        flex: 1,
        gap: 10,
    },

    inputGroupSmall: {
        flex: 1,
    },

    inputWrapperSmall: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.backgroundAlt,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 10,
        height: 40,
    },

    inputWrapperDisabled: {
        backgroundColor: "rgba(100, 100, 100, 0.1)",
        borderColor: "rgba(100, 100, 100, 0.2)",
    },

    inputFieldSmall: {
        flex: 1,
        fontSize: 13,
        color: colors.textPrimary,
        fontWeight: "600",
        paddingVertical: 8,
    },

    inputIcon: {
        marginRight: 8,
    },

    // ==================== FORM SECTION ====================
    formSection: {
        marginBottom: 20,
    },

    sectionTitle: {
        fontSize: 12,
        fontWeight: "800",
        color: colors.accent,
        marginBottom: 14,
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },

    rowContainer: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 10,
    },

    halfWidth: {
        flex: 1,
    },

    inputLabel: {
        fontSize: 12,
        fontWeight: "800",
        color: colors.textPrimary,
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.2,
    },

    inputGroup: {
        flex: 1,
    },

    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        height: 48,
        elevation: 2,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },

    inputField: {
        flex: 1,
        fontSize: 14,
        color: colors.textPrimary,
        fontWeight: "600",
    },

    pickerWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        height: 48,
        overflow: "hidden",
        elevation: 2,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },

    picker: {
        flex: 1,
        height: 48,
        color: colors.textPrimary,
        fontSize: 14,
    },

    // ==================== INFO CARD ====================
    infoCard: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 10,
    },

    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    infoText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: "600",
        flex: 1,
    },

    // ==================== BUTTONS ====================
    updateButton: {
        flexDirection: "row",
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
        elevation: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },

    updateButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "800",
        letterSpacing: 0.3,
    },

    buttonDisabled: {
        opacity: 0.6,
    },

    cancelButton: {
        flexDirection: "row",
        backgroundColor: colors.surface,
        paddingVertical: 12,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        borderWidth: 2,
        borderColor: colors.primary,
        elevation: 2,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
    },

    cancelButtonText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: "800",
        letterSpacing: 0.3,
    },
});

