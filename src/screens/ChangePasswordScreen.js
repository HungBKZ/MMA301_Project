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
import { updateUserPassword } from "../database/accountDB";

export default function ChangePasswordScreen({ navigation }) {
    const { user: authUser } = useAuth();
    const [newPass, setNewPass] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    // show/hide toggles
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleChange = async () => {
        if (!authUser || !authUser.email || !authUser.id) {
            Alert.alert("Error", "Account cannot be identified.");
            return;
        }
        if (!newPass || !confirm) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }
        if (newPass.length < 6) {
            Alert.alert("Error", "New password must be at least 6 characters.");
            return;
        }
        if (newPass !== confirm) {
            Alert.alert("Error", "New password and confirmation do not match.");
            return;
        }

        setLoading(true);
        try {
            const ok = await updateUserPassword(authUser.id, newPass);
            if (ok) {
                Alert.alert("Success", "Password has been updated.", [
                    { text: "OK", onPress: () => navigation.goBack() },
                ]);
            } else {
                Alert.alert("Error", "Unable to update password. Please try again later.");
            }
        } catch (e) {
            console.error("ChangePassword error:", e);
            Alert.alert("Error", "An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Change Password</Text>

                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordRow}>
                    <TextInput
                        style={[styles.input, { paddingRight: 44 }]}
                        secureTextEntry={!showNew}
                        value={newPass}
                        onChangeText={setNewPass}
                        placeholder="New password (>=6 characters)"
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew((s) => !s)}>
                        <Ionicons name={showNew ? "eye-off" : "eye"} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.passwordRow}>
                    <TextInput
                        style={[styles.input, { paddingRight: 44 }]}
                        secureTextEntry={!showConfirm}
                        value={confirm}
                        onChangeText={setConfirm}
                        placeholder="Re-enter new password"
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm((s) => !s)}>
                        <Ionicons name={showConfirm ? "eye-off" : "eye"} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleChange} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update Password</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelText}>Go Back</Text>
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
        backgroundColor: "#000",
        color: "#fff",
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
    cancelBtn: { marginTop: 18, alignItems: "center", paddingVertical: 8 },
    cancelText: { color: colors.textSecondary },
});