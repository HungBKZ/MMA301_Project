import React, { useEffect, useState } from "react";
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { colors, commonStyles } from "../../styles/commonStyles";
import { Ionicons } from "@expo/vector-icons";
import { authenticate, upsertOAuthUser, getUserByEmail } from "../../database/accountDB";
import { useAuth } from "../../auth/AuthContext";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
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
      const user = getUserByEmail(profile.email);
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
      console.error("Google login error:", e);
      setErr("Lỗi đăng nhập Google. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const onLogin = async () => {
    if (!email.trim()) {
      setErr("Vui lòng nhập email");
      return;
    }
    if (!password) {
      setErr("Vui lòng nhập mật khẩu");
      return;
    }

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
      await login({
        id: user.id,
        email: user.email,
        role: user.role,
        phone: user.phone,
        date_of_birth: user.date_of_birth,
        gender: user.gender,
        name: user.name,
      });
    } catch (e) {
      console.error("Login error:", e);
      setErr("Lỗi đăng nhập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================== HEADER ==================== */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="film" size={48} color={colors.primary} />
          </View>
          <Text style={styles.appTitle}>AquaFive Cinema</Text>
          <Text style={styles.appSubtitle}>Buy movie tickets online</Text>
        </View>

        {/* ==================== ERROR MESSAGE ==================== */}
        {err && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={styles.errorText}>{err}</Text>
          </View>
        )}

        {/* ==================== LOGIN FORM ==================== */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Login</Text>
          <Text style={styles.formSubtitle}>Please enter your information</Text>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail" size={20} color={colors.accent} style={styles.inputIcon} />
              <TextInput
                placeholder="example@gmail.com"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textSecondary}
                editable={!loading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed" size={20} color={colors.accent} style={styles.inputIcon} />
              <TextInput
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                style={[styles.input, { flex: 1 }]}
                placeholderTextColor={colors.textSecondary}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color={colors.accent}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotButton}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={onLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="log-in" size={20} color="#FFFFFF" />
                <Text style={styles.loginButtonText}>Login</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ==================== SIGNUP LINK ==================== */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.signupLink}>Create a new account</Text>
          </TouchableOpacity>
        </View>

        {/* ==================== FEATURES ==================== */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="ticket" size={24} color={colors.accent} />
            </View>
            <Text style={styles.featureTitle}>Buy tickets easily</Text>
            <Text style={styles.featureDesc}>Book movie tickets with just a few taps</Text>
          </View>

          {/* <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="star" size={24} color={colors.accent} />
            </View>
            <Text style={styles.featureTitle}>Rate Movies</Text>
            <Text style={styles.featureDesc}>Share your thoughts on your favorite films</Text>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="heart" size={24} color={colors.accent} />
            </View>
            <Text style={styles.featureTitle}>Wishlist</Text>
            <Text style={styles.featureDesc}>Save your favorite movies to watch later</Text>
          </View> */}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  // ==================== HEADER ====================
  header: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 20,
  },

  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    elevation: 5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  appTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  appSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  // ==================== ERROR MESSAGE ====================
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(239, 83, 80, 0.1)",
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 20,
  },

  errorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },

  // ==================== FORM CONTAINER ====================
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },

  formTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },

  formSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
    marginBottom: 20,
  },

  // ==================== INPUT GROUP ====================
  inputGroup: {
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 48,
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: "600",
  },

  eyeBtn: {
    padding: 8,
    marginLeft: 8,
  },

  // ==================== FORGOT PASSWORD ====================
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: 16,
  },

  forgotText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // ==================== LOGIN BUTTON ====================
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: 16,
  },

  loginButtonDisabled: {
    opacity: 0.7,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // ==================== DIVIDER ====================
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 12,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },

  dividerText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },

  // ==================== GOOGLE BUTTON ====================
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#DB4437",
    elevation: 2,
    shadowColor: "#DB4437",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  googleButtonDisabled: {
    opacity: 0.7,
  },

  googleButtonText: {
    color: "#DB4437",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // ==================== SIGNUP LINK ====================
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },

  signupText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  signupLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "800",
    textDecorationLine: "underline",
    letterSpacing: 0.2,
  },

  // ==================== FEATURES ====================
  featuresContainer: {
    marginBottom: 20,
  },

  featureItem: {
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 12,
  },

  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },

  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
    letterSpacing: 0.2,
  },

  featureDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    fontWeight: "500",
  },
});

