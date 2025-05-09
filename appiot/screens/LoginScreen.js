import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // state สำหรับ loading

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true); // เริ่มโหลด
    try {
      const response = await axios.post(
        "http://192.168.1.235:3000/api/user/login",
        { email, password }
      );

      if (response.status === 200) {
        const { token, user } = response.data;

        // ✅ บันทึก Token ลง AsyncStorage
        await AsyncStorage.setItem("token", token);
        await AsyncStorage.setItem("user", JSON.stringify(user));

        // ✅ ไปที่ Lobby และส่งข้อมูล user
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "Lobby",
              params: {
                token,
                user,
              },
            },
          ],
        });
      }
    } catch (error) {
      console.error("Login Error:", error?.response?.data || error.message);
      Alert.alert(
        "Login Failed",
        error?.response?.data?.error || "Please check your credentials."
      );
    } finally {
      setLoading(false); // หยุดโหลด
    }
  };

  const handleRegister = () => {
    navigation.navigate("Register");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <>
          <Button title="Login" onPress={handleLogin} />
          <View style={styles.spacing} />
          <Button title="Register" onPress={handleRegister} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 30,
    marginBottom: 20,
    fontWeight: "bold",
  },
  spacing: {
    height: 18,
  },
  input: {
    width: "80%",
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
});
