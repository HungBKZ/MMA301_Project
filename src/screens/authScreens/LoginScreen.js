import React, { useEffect, useState } from "react";
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { colors } from "../../styles/commonStyles";
import { Ionicons } from "@expo/vector-icons";
import { authenticate, upsertOAuthUser, getUserByEmail } from "../../database/accountDB";
import { useAuth } from "../../auth/AuthContext";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false); // Thêm state này
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const GOOGLE_CONFIG = {
    expoClientId: "<YOUR_EXPO_CLIENT_ID>",
    iosClientId: "<IOS_CLIENT_ID>",
    androidClientId: "<ANDROID_CLIENT_ID>",
    webClientId: "<WEB_CLIENT_ID>",
    scopes: ["profile", "email"],
  };

  const [request, response, promptAsync] = Google.useAuthRequest(GOOGLE_CONFIG);

  useEffect(() => {
    if (!response) return;
    if (response.type === "success") {
      const accessToken = response.authentication?.accessToken;
      if (accessToken) handleGoogleLogin(accessToken);
    } else if (response.type === "error") {
      setErr("Lỗi đăng nhập Google");
    }
  }, [response]);

  const handleGoogleLogin = async (accessToken) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch google profile");
      const profile = await res.json();
      const oauthId = profile.sub || profile.id;
      await upsertOAuthUser("google", oauthId, profile.email, profile.name, profile.picture);
      // read user from DB
      const user = getUserByEmail(profile.email);
      const role = user?.role || "user";
      if (user) {
        await login({
          id: user.id,
          email: user.email,
          role: user.role,
          phone: user.phone,
          date_of_birth: user.date_of_birth,
          gender: user.gender,
        });
      }
  // AuthProvider state is updated via login(); AppNavigator will switch to the
  // appropriate tabs automatically. No explicit navigation.replace is needed.
    } catch (e) {
      console.error("Google login error:", e);
      Alert.alert("Login failed", "Google login error");
    } finally {
      setLoading(false);
    }
  };

const onLogin = async () => {
  setLoading(true);
  setErr(null);
  try {
    const r = await authenticate(email.trim(), password);
    if (!r.success) {
      if (r.error === "NO_USER") setErr("Email không tồn tại.");
      else if (r.error === "INVALID_CREDENTIALS") setErr("Mật khẩu không đúng.");
      else setErr("Lỗi đăng nhập: " + String(r.error));
      setLoading(false);
      return;
    }
    const user = r.user;
    // persist session with full profile fields so Profile/Update screens can read them
    await login({
      id: user.id,
      email: user.email,
      role: user.role,
      phone: user.phone,
      date_of_birth: user.date_of_birth,
      gender: user.gender,
    });
  // Auth state updated above; AppNavigator will render the authenticated stacks.
  } catch (e) {
    console.error("Login error:", e);
    setErr("Lỗi đăng nhập.");
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng nhập</Text>
      {err && <Text style={styles.error}>{err}</Text>}

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <View style={styles.passwordRow}>
        <TextInput
          placeholder="Mật khẩu"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          style={[styles.input, { flex: 1 }]}
        />
        <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
          <Ionicons name={showPassword ? "eye" : "eye-off"} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Button title={loading ? "Đang xử lý..." : "Đăng nhập Email"} onPress={onLogin} disabled={loading} color={colors.primary} />

      <View style={{ height: 12 }} />

      <Button title="Đăng nhập bằng Google" onPress={() => promptAsync()} disabled={loading || !request} color="#db4437" />

      <View style={{ height: 24 }} />
      <Button title="Tạo tài khoản mới" onPress={() => navigation.navigate("Register")} color={colors.textSecondary} />
    </View>
  );
}



const styles = StyleSheet.create({
  container: { padding: 24, flex: 1, justifyContent: "center", backgroundColor: "#f9f9f9" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 32, textAlign: "center", color: colors.primary },
  input: { borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 16, borderRadius: 8, backgroundColor: "#fff" },
  error: { color: "red", marginBottom: 16, textAlign: "center", padding: 8, borderWidth: 1, borderColor: "red", borderRadius: 4, backgroundColor: "#fee" },
  passwordRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  eyeBtn: { padding: 8 },
});