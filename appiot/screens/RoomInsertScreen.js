import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Text, Alert } from "react-native";
import axios from "axios";

const InsertRoomScreen = ({ route, navigation }) => {
  const [roomName, setRoomName] = useState("");
  const { token } = route.params; // ดึง token จาก route params

  // ฟังก์ชันสำหรับการเพิ่มห้อง
  const insertRoom = async () => {
    if (!roomName) {
      Alert.alert("Error", "โปรดระบุชื่อห้อง");
      return;
    }
    console.log(token);
    try {
      const response = await axios.post(
        "http://192.168.1.235:3000/api/device/insertroom",
        { room_name: roomName },
        {
          headers: {
            Authorization: `Bearer ${token}`, // ส่ง token ไปด้วย
          },
        }
      );

      if (response.status === 201) {
        Alert.alert("Success", "ห้องถูกเพิ่มสำเร็จ");
        setRoomName("");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error inserting room:", error.response?.data || error);
      Alert.alert("Error", "เกิดข้อผิดพลาดขณะบันทึกห้อง");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>เพิ่มห้อง</Text>
      <TextInput
        style={styles.input}
        placeholder="ระบุชื่อห้อง"
        value={roomName}
        onChangeText={setRoomName}
        returnKeyType="done" // เมื่อกดปุ่ม Enter หรือ Done จะทำการยืนยันการกรอก
      />
      <Button title="เพิ่มห้อง" onPress={insertRoom} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
});

export default InsertRoomScreen;
