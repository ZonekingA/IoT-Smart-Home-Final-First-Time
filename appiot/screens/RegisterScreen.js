import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import Header from "../components/Header";
import InputField from "../components/InputField";
import Button from "../components/Button";

const RegisterScreen = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const navigation = useNavigation(); // ใช้ navigation

  const handleRegister = async () => {
    if (!name || !password || !email || !phoneNumber) {
      Alert.alert("แจ้งเตือน", "โปรดกรอกข้อมูลให้ครบ");
      return;
    }

    if (password.length < 8) {
      Alert.alert("แจ้งเตือน", "กรุณาใส่รหัสผ่านอย่างน้อย 8 ตัวอักษร");
      return;
    }

    try {
      const response = await axios.post(
        "http://192.168.1.235:3000/api/user/register",
        {
          name,
          password,
          email,
          phone_number: phoneNumber,
        }
      );

      if (response.status === 201) {
        Alert.alert("สำเร็จ", "ลงทะเบียนสำเร็จ", [
          {
            text: "OK",
            onPress: () => navigation.navigate("Login"),
          },
        ]);
      }
    } catch (error) {
      console.log(error);

      if (error.response) {
        const { status, data } = error.response;
        if (status === 400 && data === "Email already exists") {
          Alert.alert("แจ้งเตือน", "มีอีเมลนี้อยู่ในระบบแล้ว");
        } else if (
          status === 400 &&
          data === "Password must be at least 8 characters long"
        ) {
          Alert.alert("แจ้งเตือน", "กรุณาใส่รหัสผ่านอย่างน้อย 8 ตัวอักษร");
        } else if (
          status === 400 &&
          data === "Please provide all required fields"
        ) {
          Alert.alert("แจ้งเตือน", "โปรดกรอกข้อมูลให้ครบ");
        } else {
          Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่");
        }
      } else {
        Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์");
      }
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Register" />
      <InputField placeholder="Username" value={name} onChangeText={setName} />
      <InputField
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <InputField
        placeholder="Phone Number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <InputField placeholder="E-mail" value={email} onChangeText={setEmail} />
      <Button title="Register" onPress={handleRegister} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
});

export default RegisterScreen;
