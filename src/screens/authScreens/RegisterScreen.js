import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  Alert,
} from "react-native";
import { colors } from "../../styles/commonStyles";
import { Ionicons } from "@expo/vector-icons";
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
      if (!res.canceled && res.assets && res.assets[0]?.uri) setAvatarUri(res.assets[0].uri);
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
      setErr("Vui lòng điền đầy đủ các trường bắt buộc (*)."); return;
    }
    if (!isEmailValid(email.trim())) { setErr("Email không đúng định dạng."); return; }
    if (!isPhoneValid(phone.trim())) { setErr("Số điện thoại phải có 10 chữ số và bắt đầu bằng 0."); return; }
    if (!isDobValid(dateOfBirth.trim())) { setErr("Ngày sinh không hợp lệ hoặc dưới 13 tuổi."); return; }
    if (!isPasswordValid(password)) { setErr("Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ và số."); return; }
    if (password !== confirmPassword) { setErr("Mật khẩu xác nhận không khớp."); return; }

    setLoading(true);
    try {
      const existing = getUserByEmail(email.trim());
      if (existing) { setErr("EMAIL_EXISTS"); setLoading(false); return; }
      const r = await addUser(email.trim(), password, name.trim() || null, avatarUri || null, "User");
      if (!r.success) { setErr("Đăng ký thất bại"); setLoading(false); return; }
      // fetch user to read role (default User)
  const user = getUserByEmail(email.trim());
  if (user) await login({ id: user.id, email: user.email, role: user.role });
  navigation.replace("Main", { role: user?.role || "user", userId: user?.id, email: user?.email });
    } catch (e) {
      console.error("Register error:", e);
      setErr("Lỗi khi đăng ký.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tạo tài khoản</Text>
      {err ? <Text style={styles.error}>{err}</Text> : null}
      <View style={styles.rowTop}>
        <TouchableOpacity style={styles.avatarBox} onPress={pickImage}>
          {avatarUri ? (
            <>
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              <TouchableOpacity style={styles.clearAvatar} onPress={clearAvatar}>
                <Ionicons name="close-circle" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="camera" size={22} color={colors.textSecondary} />
              <Text style={styles.avatarText}>Avatar</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <TextInput placeholder="Họ tên (tùy chọn)" value={name} onChangeText={setName} style={styles.inputSmall} />
          <TextInput placeholder="Email *" value={email} onChangeText={setEmail} style={styles.inputSmall} keyboardType="email-address" autoCapitalize="none" />
        </View>
      </View>

      <View style={styles.row}>
        <TextInput placeholder="Số điện thoại *" value={phone} onChangeText={setPhone} style={[styles.input, styles.half]} keyboardType="phone-pad" />
        <TouchableOpacity style={[styles.input, styles.half, styles.dateBtn]} onPress={() => setShowDatePicker(true)}>
          <Text style={{ color: dateOfBirth ? "#000" : colors.textSecondary }}>{dateOfBirth || "Ngày sinh *"}</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker value={dateOfBirth ? new Date(dateOfBirth) : new Date(new Date().getFullYear() - 20, 0, 1)} mode="date" display="default" maximumDate={new Date()} onChange={onChangeDate} />
      )}

      <View style={styles.genderRow}>
        <Text style={styles.genderLabel}>Giới tính *</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={gender} onValueChange={(value) => setGender(value)} mode="dropdown" style={styles.picker}>
            <Picker.Item label="Chọn giới tính..." value="" />
            <Picker.Item label="Nam" value="male" />
            <Picker.Item label="Nữ" value="female" />
            <Picker.Item label="Khác" value="other" />
          </Picker>
        </View>
      </View>

      <View style={styles.passwordRow}>
        <TextInput placeholder="Mật khẩu (6+ ký tự, chữ + số) *" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} style={[styles.input, styles.inputFlex]} />
        <TouchableOpacity onPress={() => setShowPassword((s) => !s)} style={styles.eyeBtn}>
          <Ionicons name={showPassword ? "eye" : "eye-off"} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.passwordRow}>
        <TextInput placeholder="Xác nhận mật khẩu *" secureTextEntry={!showConfirm} value={confirmPassword} onChangeText={setConfirmPassword} style={[styles.input, styles.inputFlex]} />
        <TouchableOpacity onPress={() => setShowConfirm((s) => !s)} style={styles.eyeBtn}>
          <Ionicons name={showConfirm ? "eye" : "eye-off"} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={onRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Tạo tài khoản</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelText}>Quay lại / Đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
}

const INPUT_H = 40;
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14, paddingTop: Platform.OS === "android" ? 14 : 26, backgroundColor: "#fff", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8, color: colors.primary },
  rowTop: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatarBox: { width: 78, height: 78, borderRadius: 8, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  avatarPlaceholder: { alignItems: "center" }, avatarText: { fontSize: 11, color: colors.textSecondary, marginTop: 4 }, avatarImg: { width: 78, height: 78, borderRadius: 6 },
  clearAvatar: { position: "absolute", top: -6, right: -6, backgroundColor: "#d33", borderRadius: 12, padding: 2 },
  input: { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, marginBottom: 8, borderRadius: 8, height: INPUT_H, backgroundColor: "#fff", fontSize: 13, justifyContent: "center" },
  inputSmall: { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, marginBottom: 6, borderRadius: 8, height: INPUT_H - 4, backgroundColor: "#fff", fontSize: 13 },
  inputFlex: { flex: 1 }, half: { width: "48%" }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, dateBtn: { justifyContent: "center" },
  genderRow: { marginTop: 6, marginBottom: 6 }, genderLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 }, pickerWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: "hidden", backgroundColor: "#fff" }, picker: { height: 40 },
  passwordRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 }, eyeBtn: { marginLeft: 8, padding: 6, justifyContent: "center", alignItems: "center" },
  btn: { marginTop: 6, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 8, alignItems: "center" }, btnDisabled: { opacity: 0.8 }, btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cancelBtn: { marginTop: 8, alignItems: "center", paddingVertical: 6 }, cancelText: { color: colors.textSecondary }, error: { color: "red", marginBottom: 6, textAlign: "center", padding: 6, borderWidth: 1, borderColor: "red", borderRadius: 4, backgroundColor: "#fee" }
});