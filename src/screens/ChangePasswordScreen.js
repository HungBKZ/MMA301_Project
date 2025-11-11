import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../styles/commonStyles";
import { useAuth } from "../auth/AuthContext";
import { authenticate, updateUserPassword } from "../database/accountDB";

export default function ChangePasswordScreen({ navigation }) {
  const { user: authUser } = useAuth();
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // show/hide toggles
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = async () => {
    if (!authUser || !authUser.email || !authUser.id) {
      Alert.alert("Lỗi", "Không xác định được tài khoản.");
      return;
    }
    if (!oldPass || !newPass || !confirm) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ các trường.");
      return;
    }
    if (newPass.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu mới phải ít nhất 6 ký tự.");
      return;
    }
    if (newPass !== confirm) {
      Alert.alert("Lỗi", "Mật khẩu mới và xác nhận không khớp.");
      return;
    }

    setLoading(true);
    try {
      const emailClean = authUser.email.trim().toLowerCase();
      const authRes = await authenticate(emailClean, oldPass);
      if (!authRes.success) {
        if (authRes.error === "NO_USER") {
          Alert.alert("Lỗi", "Không tìm thấy tài khoản.");
        } else if (authRes.error === "INVALID_CREDENTIALS") {
          Alert.alert("Lỗi", "Mật khẩu cũ không đúng.");
        } else {
          Alert.alert("Lỗi", "Xác thực thất bại.");
        }
        setLoading(false);
        return;
      }

      const ok = await updateUserPassword(authUser.id, newPass);
      if (ok) {
        Alert.alert("Thành công", "Mật khẩu đã được cập nhật.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Lỗi", "Không thể cập nhật mật khẩu. Thử lại sau.");
      }
    } catch (e) {
      console.error("ChangePassword error:", e);
      Alert.alert("Lỗi", "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Đổi mật khẩu</Text>

        <Text style={styles.label}>Mật khẩu hiện tại</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { paddingRight: 44 }]}
            secureTextEntry={!showOld}
            value={oldPass}
            onChangeText={setOldPass}
            placeholder="Nhập mật khẩu hiện tại"
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowOld((s) => !s)}>
            <Ionicons name={showOld ? "eye-off" : "eye"} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Mật khẩu mới</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { paddingRight: 44 }]}
            secureTextEntry={!showNew}
            value={newPass}
            onChangeText={setNewPass}
            placeholder="Mật khẩu mới (>=6 ký tự)"
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew((s) => !s)}>
            <Ionicons name={showNew ? "eye-off" : "eye"} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { paddingRight: 44 }]}
            secureTextEntry={!showConfirm}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Nhập lại mật khẩu mới"
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm((s) => !s)}>
            <Ionicons name={showConfirm ? "eye-off" : "eye"} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleChange} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Cập nhật mật khẩu</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  card: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, elevation: 2 },
  title: { fontSize: 20, fontWeight: "700", color: colors.primary, marginBottom: 12, textAlign: "center" },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: 8 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginTop: 6,
    backgroundColor: "#fff",
    color: colors.textPrimary,
  },
  passwordRow: { position: "relative", justifyContent: "center" },
  eyeBtn: { position: "absolute", right: 8, top: 14, padding: 6 },
  btn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.8 },
  btnText: { color: "#fff", fontWeight: "700" },
});