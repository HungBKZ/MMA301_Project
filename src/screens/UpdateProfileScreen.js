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
import { colors } from "../styles/commonStyles";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { getUserById, getUserByEmail, updateUserProfile } from "../database/accountDB";

export default function UpdateProfileScreen({ navigation, route }) {
    const { userId, email } = route?.params || {};
    const [initLoading, setInitLoading] = useState(true); // loading while fetching user
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);

    // Form state
    const [name, setName] = useState("");
    const [avatarUri, setAvatarUri] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [gender, setGender] = useState("");
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                let user = null;
                if (userId) {
                    user = getUserById(userId);
                } else if (email) {
                    user = getUserByEmail(email);
                } else {
                }

                if (!user) {
                    Alert.alert("Lỗi", "Không tìm thấy tài khoản để cập nhật.", [{ text: "OK", onPress: () => navigation.goBack() }]);
                    return;
                }

                setName(user.name || "");
                setAvatarUri(user.avatar_uri || "");
                setUserEmail(user.email || "");
                setPhone(user.phone || "");
                setDateOfBirth(user.date_of_birth || "");
                setGender(user.gender || "");
            } catch (e) {
                Alert.alert("Lỗi", "Không thể tải dữ liệu tài khoản.");
            } finally {
                await ImagePicker.requestMediaLibraryPermissionsAsync();
                setInitLoading(false);
            }
        })();
    }, [userId, email]);

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

    const isPhoneValid = (ph) => /^0\d{9}$/.test(ph);
    const isDobValid = (dob) => {
        const d = new Date(dob);
        if (isNaN(d.getTime())) return false;
        const today = new Date();
        const age = today.getFullYear() - d.getFullYear() - (today < new Date(d.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
        return age >= 13 && d < today;
    };

    const onUpdate = async () => {
        setErr(null);
        if (!phone || !dateOfBirth) {
            setErr("Vui lòng nhập số điện thoại và ngày sinh.");
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

        setLoading(true);
        try {
            if (!userId) {
                setErr("Không xác định được tài khoản để cập nhật.");
                setLoading(false);
                return;
            }
            const ok = updateUserProfile(userId, {
                name: name.trim(),
                avatar_uri: avatarUri || null,
                phone: phone.trim(),
                date_of_birth: dateOfBirth.trim(),
                gender,
            });
            if (ok) {
                Alert.alert("Thành công", "Cập nhật tài khoản thành công!", [
                    { text: "OK", onPress: () => navigation.goBack() },
                ]);
            } else {
                setErr("Cập nhật thất bại.");
            }
        } catch (e) {
            console.error("UpdateProfile error:", e);
            setErr("Lỗi khi cập nhật.");
        } finally {
            setLoading(false);
        }
    };

    if (initLoading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Cập nhật tài khoản</Text>
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

                <View style={{ flex: 1, marginLeft: 16 }}>
                    <TextInput
                        placeholder="Họ tên"
                        value={name}
                        onChangeText={setName}
                        style={styles.inputSmall}
                    />
                    <TextInput
                        placeholder="Email"
                        value={userEmail}
                        editable={false}
                        style={[styles.inputSmall, { backgroundColor: "#eee", color: "#888" }]}
                    />
                </View>
            </View>

            <View style={styles.row}>
                <TextInput
                    placeholder="Số điện thoại *"
                    value={phone}
                    onChangeText={setPhone}
                    style={[styles.input, styles.half, { marginRight: 12 }]}
                    keyboardType="phone-pad"
                />
                <TouchableOpacity
                    style={[styles.input, styles.half, styles.dateBtn]}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Text style={{ color: dateOfBirth ? "#000" : colors.textSecondary }}>
                        {dateOfBirth || "Ngày sinh *"}
                    </Text>
                </TouchableOpacity>
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

            <View style={styles.genderRow}>
                <Text style={styles.genderLabel}>Giới tính</Text>
                <View style={styles.pickerWrap}>
                    <Picker
                        selectedValue={gender}
                        onValueChange={(value) => setGender(value)}
                        mode="dropdown"
                        style={styles.picker}
                    >
                        <Picker.Item label="Chọn giới tính..." value="" />
                        <Picker.Item label="Nam" value="male" />
                        <Picker.Item label="Nữ" value="female" />
                        <Picker.Item label="Khác" value="other" />
                    </Picker>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={onUpdate}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.btnText}>Cập nhật</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelText}>Quay lại</Text>
            </TouchableOpacity>
        </View>
    );
}
const INPUT_H = 40;
const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 18, paddingTop: Platform.OS === "android" ? 24 : 36, backgroundColor: "#fff", justifyContent: "center" },
    title: { fontSize: 24, fontWeight: "700", marginBottom: 18, color: colors.primary, textAlign: "center" },
    rowTop: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
    avatarBox: { width: 78, height: 78, borderRadius: 8, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginRight: 18 },
    avatarPlaceholder: { alignItems: "center" }, avatarText: { fontSize: 11, color: colors.textSecondary, marginTop: 4 }, avatarImg: { width: 78, height: 78, borderRadius: 6 },
    clearAvatar: { position: "absolute", top: -6, right: -6, backgroundColor: "#d33", borderRadius: 12, padding: 2 },
    input: { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, marginBottom: 18, borderRadius: 8, height: INPUT_H, backgroundColor: "#fff", fontSize: 13, justifyContent: "center" },
    inputSmall: { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, marginBottom: 18, borderRadius: 8, height: INPUT_H - 4, backgroundColor: "#fff", fontSize: 13 },
    inputFlex: { flex: 1 }, half: { width: "48%" }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }, dateBtn: { justifyContent: "center" },
    genderRow: { marginTop: 12, marginBottom: 18 }, genderLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 }, pickerWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: "hidden", backgroundColor: "#fff" }, picker: { height: 40 },
    btn: { marginTop: 12, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: "center" }, btnDisabled: { opacity: 0.8 }, btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    cancelBtn: { marginTop: 18, alignItems: "center", paddingVertical: 8 }, cancelText: { color: colors.textSecondary }, error: { color: "red", marginBottom: 12, textAlign: "center", padding: 8, borderWidth: 1, borderColor: "red", borderRadius: 4, backgroundColor: "#fee" }
});
