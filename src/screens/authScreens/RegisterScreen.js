import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
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
import { colors, commonStyles } from "../../styles/commonStyles";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { addUser, getUserByEmail } from "../../database/accountDB";
import { useAuth } from "../../auth/AuthContext";

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [avatarUri, setAvatarUri] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") { }
    })();
  }, []);

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
    } catch (e) {
      console.error("Error picking image:", e);
    }
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

  const isEmailValid = (e) => /\S+@\S+\.\S+/.test(e);
  const isPasswordValid = (p) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(p);
  const isPhoneValid = (ph) => /^0\d{9}$/.test(ph);
  const isDobValid = (dob) => {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    const age = today.getFullYear() - d.getFullYear() - (today < new Date(d.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
    return age >= 13;
  };

  const onRegister = async () => {
    setErr(null);
    if (!email.trim() || !password || !confirmPassword || !phone || !dateOfBirth || !gender) {
      setErr("Vui lòng điền đầy đủ các trường bắt buộc (*).");
      return;
    }
    if (!isEmailValid(email.trim())) {
      setErr("Email không đúng định dạng.");
      return;
    }
    if (!isPhoneValid(phone.trim())) {
      setErr("Số điện thoại phải có 10 chữ số và bắt đầu bằng 0.");
      return;
    }
    if (!isDobValid(dateOfBirth.trim())) {
      setErr("Ngày sinh không hợp lệ hoặc dưới 13 tuổi.");
      return;
    }
    if (!isPasswordValid(password)) {
      setErr("Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ và số.");
      return;
    }
    if (password !== confirmPassword) {
      setErr("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    try {
      const existing = getUserByEmail(email.trim());
      if (existing) {
        setErr("Email này đã được đăng ký.");
        setLoading(false);
        return;
      }
      const r = await addUser(
        email.trim(),
        password,
        name.trim() || null,
        avatarUri || null,
        "User",
        phone.trim(),
        dateOfBirth.trim(),
        gender
      );
      if (!r.success) {
        setErr("Đăng ký thất bại");
        setLoading(false);
        return;
      }
      const user = getUserByEmail(email.trim());
      if (user) {
        await login({
          id: user.id,
          email: user.email,
          role: user.role,
          phone: user.phone,
          date_of_birth: user.date_of_birth,
          gender: user.gender,
          name: user.name,
        });
      }
    } catch (e) {
      console.error("Register error:", e);
      setErr("Lỗi khi đăng ký.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ==================== HEADER ==================== */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Tạo tài khoản</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* ==================== TITLE CARD ==================== */}
            <View style={styles.titleCard}>
              <View style={styles.titleIconContainer}>
                <Ionicons name="person-add" size={40} color={colors.accent} />
              </View>
              <Text style={styles.title}>Tạo tài khoản mới</Text>
              <Text style={styles.subtitle}>Đăng ký để bắt đầu trải nghiệm</Text>
            </View>

            {/* ==================== ERROR MESSAGE ==================== */}
            {err && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={styles.errorText}>{err}</Text>
              </View>
            )}

            {/* ==================== AVATAR SECTION ==================== */}
            <View style={styles.avatarSection}>
              <Text style={styles.sectionLabel}>Ảnh đại diện</Text>
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
                    <Ionicons name="camera" size={40} color={colors.accent} />
                    <Text style={styles.avatarText}>Thêm ảnh đại diện</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* ==================== BASIC INFO SECTION ==================== */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Thông tin cơ bản</Text>

              {/* Name */}
              <View style={styles.inputWrapper}>
                <Ionicons name="person" size={18} color={colors.accent} style={styles.inputIcon} />
                <TextInput
                  placeholder="Họ tên (tùy chọn)"
                  value={name}
                  onChangeText={setName}
                  style={styles.inputField}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Email */}
              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={18} color={colors.accent} style={styles.inputIcon} />
                <TextInput
                  placeholder="Email *"
                  value={email}
                  onChangeText={setEmail}
                  style={styles.inputField}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* ==================== CONTACT INFO SECTION ==================== */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Thông tin liên hệ</Text>

              {/* Phone */}
              <View style={styles.inputWrapper}>
                <Ionicons name="call" size={18} color={colors.accent} style={styles.inputIcon} />
                <TextInput
                  placeholder="Số điện thoại *"
                  value={phone}
                  onChangeText={setPhone}
                  style={styles.inputField}
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Date of Birth & Gender */}
              <View style={styles.rowContainer}>
                <TouchableOpacity
                  style={[styles.inputWrapper, styles.halfWidth]}
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
                    {dateOfBirth || "Ngày sinh *"}
                  </Text>
                </TouchableOpacity>

                <View style={[styles.pickerWrapper, styles.halfWidth]}>
                  <Ionicons name="people" size={18} color={colors.accent} style={styles.inputIcon} />
                  <Picker
                    selectedValue={gender}
                    onValueChange={(value) => setGender(value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Giới tính *" value="" />
                    <Picker.Item label="Nam" value="male" />
                    <Picker.Item label="Nữ" value="female" />
                    <Picker.Item label="Khác" value="other" />
                  </Picker>
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
            </View>

            {/* ==================== SECURITY SECTION ==================== */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Bảo mật</Text>

              {/* Password */}
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={18} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  placeholder="Mật khẩu (6+ ký tự, chữ + số) *"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  style={[styles.inputField, { flex: 1 }]}
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((s) => !s)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? "eye" : "eye-off"}
                    size={18}
                    color={colors.accent}
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={18} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  placeholder="Xác nhận mật khẩu *"
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={[styles.inputField, { flex: 1 }]}
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm((s) => !s)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showConfirm ? "eye" : "eye-off"}
                    size={18}
                    color={colors.accent}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* ==================== PASSWORD REQUIREMENTS ==================== */}
            <View style={styles.requirementsCard}>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={password.length >= 6 ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                  color={password.length >= 6 ? colors.success : colors.textSecondary}
                />
                <Text style={styles.requirementText}>Ít nhất 6 ký tự</Text>
              </View>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={/[A-Za-z]/.test(password) ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                  color={/[A-Za-z]/.test(password) ? colors.success : colors.textSecondary}
                />
                <Text style={styles.requirementText}>Có chữ cái</Text>
              </View>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={/\d/.test(password) ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                  color={/\d/.test(password) ? colors.success : colors.textSecondary}
                />
                <Text style={styles.requirementText}>Có số</Text>
              </View>
            </View>

            {/* ==================== ACTION BUTTONS ==================== */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.buttonDisabled]}
              onPress={onRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.registerButtonText}>Tạo tài khoản</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton2}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={18} color={colors.primary} />
              <Text style={styles.backButtonText}>Quay lại đăng nhập</Text>
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  safeArea: {
    flex: 1,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // ==================== HEADER ====================
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },

  // ==================== TITLE CARD ====================
  titleCard: {
    alignItems: 'center',
    marginBottom: 24,
  },

  titleIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 14,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },

  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // ==================== ERROR MESSAGE ====================
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 83, 80, 0.2)',
  },

  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
  },

  // ==================== AVATAR SECTION ====================
  avatarSection: {
    marginBottom: 24,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  avatarBox: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  avatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  avatarText: {
    fontSize: 14,
    color: colors.accent,
    marginTop: 8,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  clearAvatarButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 4,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  // ==================== FORM SECTIONS ====================
  formSection: {
    marginBottom: 20,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 10,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },

  inputIcon: {
    marginRight: 10,
  },

  inputField: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  // ==================== ROW CONTAINER ====================
  rowContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },

  halfWidth: {
    flex: 1,
  },

  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 48,
    overflow: 'hidden',
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

  // ==================== PASSWORD REQUIREMENTS ====================
  requirementsCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },

  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  requirementText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // ==================== BUTTONS ====================
  registerButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  backButton2: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },

  backButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

