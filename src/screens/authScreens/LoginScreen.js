import React, { useState, useEffect } from "react";
import { View, TextInput, Button, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { colors } from "../../styles/commonStyles";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

// Import GOOGLE_CONFIG từ authService
import { GOOGLE_CONFIG, googleLogin } from "../../auth/authService";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("admin@admin.com"); // Mặc định cho tiện test admin
  const [password, setPassword] = useState("admin123"); // Mặc định cho tiện test admin
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Khởi tạo Google Auth
  const [request, response, promptAsync] = Google.useAuthRequest(GOOGLE_CONFIG);

  // Xử lý Google Auth Response
  useEffect(() => {
    if (response?.type === "success") {
      handleGoogleLogin(response.authentication.accessToken);
    } else if (response?.type === "error") {
      setErr("Lỗi đăng nhập Google");
    }
  }, [response]);

  const handleGoogleLogin = async (accessToken) => {
    // Trong ứng dụng thực tế, bạn sẽ dùng accessToken để gọi API Google lấy profile.
    // Ở đây, ta dùng hàm mock googleLogin từ authService.
    setLoading(true);
    setErr(null);

    // GỌI HÀM MOCK GOOGLE LOGIN TỪ SERVICE (trong demo này)
    const r = await googleLogin({ type: "success", authentication: { accessToken } }); 

    setLoading(false);
    if (!r.success) {
      setErr(r.error === "AUTH_CANCELLED" ? null : "Lỗi đăng nhập Google.");
    }
    // Nếu thành công, AuthContext sẽ tự động điều hướng
  };


  const onLogin = async () => {
    setLoading(true);
    setErr(null);
    const r = await login(email, password);
    setLoading(false);
    if (!r.success) {
      // Hiển thị thông báo lỗi thân thiện hơn
      if (r.error === "NO_USER") setErr("Email không tồn tại.");
      else if (r.error === "INVALID_CREDENTIALS") setErr("Mật khẩu không đúng.");
      else setErr("Lỗi đăng nhập không xác định: " + r.error);
    }
    // Nếu thành công, AuthContext sẽ tự động điều hướng
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng nhập</Text>
      {err && <Text style={styles.error}>{err}</Text>}

      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
      <TextInput placeholder="Mật khẩu" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
      
      <Button title={loading ? "Đang xử lý..." : "Đăng nhập Email"} onPress={onLogin} disabled={loading} color={colors.primary} />
      
      <View style={{ height: 16 }} />

      {/* Nút đăng nhập Google */}
      <Button 
        title="Đăng nhập bằng Google" 
        onPress={() => promptAsync()} 
        disabled={loading || !request} 
        color="#db4437" // Màu đỏ Google
      />

      <View style={{ height: 24 }} />
      <Button title="Tạo tài khoản mới" onPress={() => navigation.navigate("Register")} color={colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flex: 1, justifyContent: 'center', backgroundColor: '#f9f9f9' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 32, textAlign: 'center', color: colors.primary },
  input: { borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 16, borderRadius: 8, backgroundColor: '#fff' },
  error: { color: "red", marginBottom: 16, textAlign: 'center', padding: 8, borderWidth: 1, borderColor: 'red', borderRadius: 4, backgroundColor: '#fee' },
});