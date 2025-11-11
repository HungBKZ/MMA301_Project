import React, { createContext, useContext, useState, useEffect } from "react";
import * as authService from "./authService";
import { ActivityIndicator, View } from "react-native";
import { colors } from "../styles/commonStyles"; // Cần import colors

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khởi tạo: Lấy user từ SecureStore
  useEffect(() => {
    const checkUser = async () => {
      try {
        const u = await authService.getCurrentUser();
        setUser(u);
      } catch (e) {
        console.error("Error loading session:", e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const login = async (email, password) => {
    const r = await authService.login(email, password);
    if (r.success) setUser(r.user);
    return r;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const register = async (data) => {
    const r = await authService.register(data);
    if (r.success) setUser(r.user);
    return r;
  };

  // Nếu loading, hiển thị màn hình loading toàn cục
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}