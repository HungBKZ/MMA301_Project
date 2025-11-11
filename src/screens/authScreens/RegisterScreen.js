import React, { useState } from "react";
import { View, TextInput, Button, Text, StyleSheet } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { colors } from "../../styles/commonStyles";

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();

  const onRegister = async () => {
    setErr(null);
    setLoading(true);

    if (!email || !password) {
        setErr("Vui lòng điền đầy đủ Email và Mật khẩu.");
        setLoading(false);
        return;
    }

    const r = await register({ email: email.trim(), password, name: name.trim() });
    setLoading(false);
    
    if (!r.success) {
      if (r.error === "EMAIL_EXISTS") setErr("Email này đã được sử dụng.");
      else setErr(r.error || "Đăng ký thất bại.");
      return;
    }
    // Nếu thành công, AuthContext sẽ tự động điều hướng
    navigation.goBack(); 
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tạo tài khoản</Text>
      {err && <Text style={styles.error}>{err}</Text>}
      <TextInput placeholder="Họ tên (tùy chọn)" value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
      <TextInput placeholder="Mật khẩu (tối thiểu 6 ký tự)" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
      <Button title={loading ? "Đang tạo..." : "Tạo tài khoản"} onPress={onRegister} disabled={loading} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: colors.primary },
  input: { borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 16, borderRadius: 8 },
  error: { color: "red", marginBottom: 16, textAlign: 'center', padding: 8, borderWidth: 1, borderColor: 'red', borderRadius: 4, backgroundColor: '#fee' },
});