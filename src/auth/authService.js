import * as SecureStore from "expo-secure-store";
import * as Google from "expo-auth-session/providers/google";

import {
  addUser,
  getUserByEmail,
  getUserById,
  updateUserProfile,
  updateUserPassword, // Đã đổi tên hàm
  upsertOAuthUser,
} from "../database/db";

// Dùng cho Google OAuth (cần thay thế bằng key thực tế nếu cần)
const GOOGLE_CONFIG = {
  androidClientId: "YOUR_ANDROID_CLIENT_ID",
  iosClientId: "YOUR_IOS_CLIENT_ID",
  webClientId: "YOUR_WEB_CLIENT_ID",
};

const SESSION_KEY = "movies_app_session_v1";

// ============================================
// CORE AUTH FUNCTIONS
// ============================================

// UC-1: Đăng ký
export async function register({ email, password, name = null, avatar_uri = null }) {
  try {
    const existing = getUserByEmail(email);
    if (existing) return { success: false, error: "EMAIL_EXISTS" };

    // Lưu password dạng plain text (theo yêu cầu)
    const r = addUser(email, password, name, avatar_uri, "user");
    if (!r.success) return { success: false, error: "DB_ERROR" };

    const user = getUserById(r.id);
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ id: user.id, role: user.role }));
    return { success: true, user };
  } catch (error) {
    return { success: false, error };
  }
}

// UC-2: Đăng nhập
export async function login(email, password) {
  try {
    const user = getUserByEmail(email);
    if (!user) return { success: false, error: "NO_USER" };

    // So sánh password plain text (theo yêu cầu)
    if (password !== user.password) {
      return { success: false, error: "INVALID_CREDENTIALS" };
    }

    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ id: user.id, role: user.role }));
    return { success: true, user };
  } catch (error) {
    return { success: false, error };
  }
}

// UC-4: Đăng xuất
export async function logout() {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

// UC-5: Lấy user hiện tại
export async function getCurrentUser() {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    const { id } = JSON.parse(raw);
    return getUserById(id);
  } catch {
    return null;
  }
}

// UC-5: Cập nhật hồ sơ (Tên, Email, Avatar)
export async function updateProfile(id, profile) {
  try {
    const ok = updateUserProfile(id, profile);
    return ok ? { success: true } : { success: false, error: "DB_ERROR" };
  } catch (error) {
    return { success: false, error };
  }
}

// UC-5: Đổi mật khẩu (Plain text comparison)
export async function changePassword(id, currentPassword, newPassword) {
  try {
    const user = getUserById(id);
    if (!user || !user.password) return { success: false, error: "NO_PASSWORD" };

    // So sánh mật khẩu cũ (plain text)
    if (currentPassword !== user.password)
      return { success: false, error: "INVALID_CURRENT_PASSWORD" };

    // Cập nhật mật khẩu mới (plain text)
    const ok = updateUserPassword(id, newPassword);
    return ok ? { success: true } : { success: false, error: "DB_ERROR" };
  } catch (error) {
    return { success: false, error };
  }
}

// UC-3: Đăng nhập Google OAuth (Cần logic thực tế nếu dùng)
export async function googleLogin(response) {
  // Logic giả định khi nhận được response thành công từ Expo Auth Session
  if (response.type === "success") {
    // 1. Lấy thông tin người dùng từ Google (thường là qua Access Token)
    // Giả định: response chứa profile object {id, email, name, picture}

    // --- LOGIC MOCK/PLACEHOLDER ---
    const MOCK_PROFILE = {
      id: "google-mock-12345",
      email: "mock.user@gmail.com", // Cần thay bằng email thật từ response
      name: "Google User",
      picture: "https://placehold.co/100x100/007AFF/ffffff?text=G",
    };
    // -----------------------------

    const { id: oauthId, email, name, picture } = MOCK_PROFILE;

    // 2. Upsert (Tạo/Cập nhật) user trong DB
    const r = upsertOAuthUser("google", oauthId, email, name, picture);
    if (!r.success) return { success: false, error: "DB_ERROR" };

    const user = getUserById(r.id);
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ id: user.id, role: user.role }));
    return { success: true, user, created: r.created };

  } else if (response.type === "cancel" || response.type === "dismiss") {
    return { success: false, error: "AUTH_CANCELLED" };
  } else {
    return { success: false, error: "GOOGLE_AUTH_FAILED" };
  }
}

// Export config để sử dụng trong màn hình Login/Register
export { GOOGLE_CONFIG };