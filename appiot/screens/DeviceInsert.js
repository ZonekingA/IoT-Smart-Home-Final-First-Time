import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import axios from "axios";

const InsertDeviceScreen = ({ route, navigation }) => {
  const { roomId, token } = route.params; // รับ roomId และ token จากหน้าอื่น
  const [deviceName, setDeviceName] = useState("");
  const [deviceStatus, setDeviceStatus] = useState("OFF"); // ค่าเริ่มต้นเป็น "OFF"

  // ฟังก์ชันสำหรับส่งข้อมูลไปที่ backend
  const handleAddDevice = async () => {
    if (!deviceName) {
      Alert.alert("โปรดกรอกชื่ออุปกรณ์");
      return;
    }

    try {
      console.log(roomId);
      console.log(deviceName);
      const response = await axios.post(
        "http://192.168.1.69:3000/api/device/insertdevice",
        {
          device_name: deviceName,
          device_status: deviceStatus,
          room_id: roomId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.status === 201) {
        Alert.alert(
          "เพิ่มอุปกรณ์สำเร็จ",
          `Device code: ${response.data.device_code}`
        );
        // นำทางกลับไปหน้าก่อนหน้า (หรือไปยังหน้าควบคุมห้อง)
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error adding device:", error.response?.data || error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเพิ่มอุปกรณ์ได้");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>เพิ่มอุปกรณ์ใหม่</Text>

      <TextInput
        style={styles.input}
        placeholder="ชื่ออุปกรณ์"
        value={deviceName}
        onChangeText={setDeviceName}
      />

      <View style={styles.statusContainer}>
        <Text>สถานะอุปกรณ์</Text>
        <View style={styles.switchContainer}>
          <Button
            title={deviceStatus === "ON" ? "เปิด" : "ปิด"}
            onPress={() =>
              setDeviceStatus(deviceStatus === "ON" ? "OFF" : "ON")
            }
          />
        </View>
      </View>

      <Button title="เพิ่มอุปกรณ์" onPress={handleAddDevice} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 15,
    paddingLeft: 10,
    borderRadius: 5,
  },
  statusContainer: {
    marginBottom: 20,
  },
  switchContainer: {
    marginTop: 10,
  },
});

export default InsertDeviceScreen;
