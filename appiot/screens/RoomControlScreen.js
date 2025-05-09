import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Switch,
  Text,
  FlatList,
  Button,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import axios from "axios";
import Header from "../components/Header";
import { useNavigation } from "@react-navigation/native";

const RoomControlScreen = ({ route }) => {
  const { roomId, roomName, token } = route.params;
  const navigation = useNavigation();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);
  const [webSocketError, setWebSocketError] = useState(false);

  // สำหรับการจัดการ modal edit
  const [editDeviceCode, setEditDeviceCode] = useState("");
  const [editDeviceName, setEditDeviceName] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchDevices();
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchDevices();
    });
    return unsubscribe;
  }, [navigation]);

  const connectWebSocket = () => {
    if (ws) return;

    const socket = new WebSocket("ws://192.168.1.235:8080");

    socket.onopen = () => {
      console.log("WebSocket Connected");
      setWs(socket);
      setWebSocketError(false);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received WebSocket message:", data);

        setDevices((prevDevices) =>
          prevDevices.map((device) =>
            device.device_code === data.device_code
              ? { ...device, device_status: data.device_status }
              : device
          )
        );
      } catch (error) {
        console.error("❌ Error parsing WebSocket message:", error);
      }
    };

    socket.onclose = () => {
      console.warn("⚠️ WebSocket Disconnected, retrying in 3 seconds...");
      setWebSocketError(true);
      setTimeout(connectWebSocket, 3000);
    };

    socket.onerror = (error) => {
      setWebSocketError(true);
    };
  };

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const url = `http://192.168.1.235:3000/api/device/devices/${roomId}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.devices && Array.isArray(response.data.devices)) {
        setDevices(response.data.devices);
      } else {
        setDevices([]);
      }
    } catch (error) {
      console.error(
        "❌ Error fetching devices:",
        error.response?.data || error
      );
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDeviceStatus = async (device) => {
    if (!device.device_code) {
      console.warn("⚠️ Missing device_code", device);
      return;
    }

    const newStatus = device.device_status === "ON" ? "OFF" : "ON";

    setDevices((prevDevices) =>
      prevDevices.map((d) =>
        d.device_code === device.device_code
          ? { ...d, device_status: newStatus }
          : d
      )
    );

    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        const message = {
          device_code: device.device_code,
          device_status: newStatus,
        };
        ws.send(JSON.stringify(message));
      } else {
        console.warn("⚠️ WebSocket not connected!");
      }

      const payload = {
        devices: [
          { device_code: device.device_code, device_status: newStatus },
        ],
      };

      const response = await axios.post(
        "http://192.168.1.235:3000/api/device/updatedevice",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("API Response:", response.data);
    } catch (error) {
      console.error("Error updating device:", error.response?.data || error);

      setDevices((prevDevices) =>
        prevDevices.map((d) =>
          d.device_code === device.device_code
            ? { ...d, device_status: device.device_status }
            : d
        )
      );
    }
  };

  const handleEditDevice = (device) => {
    setEditDeviceCode(device.device_code);
    setEditDeviceName(device.device_name);
    setModalVisible(true);
  };

  const saveEditedDevice = async () => {
    try {
      await axios.put(
        `http://192.168.1.235:3000/api/device/editdevice`,
        {
          device_code: editDeviceCode,
          device_name: editDeviceName,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setModalVisible(false);
      fetchDevices(); // เรียกใช้ฟังก์ชัน fetchDevices เพื่อดึงข้อมูลใหม่
    } catch (error) {
      console.error(
        "Error updating device:",
        error.response?.data || error.message
      );
    }
  };

  const handleDeleteDevice = (device_code) => {
    Alert.alert("ยืนยันการลบ", "คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์นี้?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await axios.delete(
              `http://192.168.1.235:3000/api/device/deletedevice/${device_code}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            console.log("✅ ลบอุปกรณ์เรียบร้อย:", response.data);
            fetchDevices();
          } catch (error) {
            console.error("ลบอุปกรณ์ล้มเหลว:", error.response?.data || error);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title={`Room: ${roomName}`} />
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : devices.length > 0 ? (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.device_code.toString()}
          renderItem={({ item }) => (
            <View style={styles.control}>
              <View>
                <Text style={styles.deviceName}>{item.device_name}</Text>
                <Text style={styles.deviceCode}>
                  Code:{" "}
                  <Text style={styles.deviceCodeText}>{item.device_code}</Text>
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Switch
                  value={item.device_status === "ON"}
                  onValueChange={() => toggleDeviceStatus(item)}
                />
                <View style={styles.editDeleteButtons}>
                  <Button title="Edit" onPress={() => handleEditDevice(item)} />
                  <Button
                    title="DELETE"
                    onPress={() => handleDeleteDevice(item.device_code)}
                    color="#FF3B30"
                  />
                </View>
              </View>
            </View>
          )}
        />
      ) : (
        <Text style={styles.noDevices}>No devices found</Text>
      )}

      {webSocketError && (
        <Text style={styles.webSocketError}>
          ⚠️ WebSocket Disconnected. Retrying...
        </Text>
      )}

      <View style={styles.footerContainer}>
        <Button
          title="เพิ่มอุปกรณ์"
          onPress={() =>
            navigation.navigate("DeviceInsert", {
              roomId,
              token,
            })
          }
        />
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 10,
              width: "80%",
            }}
          >
            <Text style={{ fontSize: 18, marginBottom: 10 }}>
              แก้ไขชื่ออุปกรณ์
            </Text>
            <TextInput
              value={editDeviceName}
              onChangeText={setEditDeviceName}
              style={styles.input}
              placeholder="กรอกชื่ออุปกรณ์ใหม่"
            />
            <Button title="บันทึก" onPress={saveEditedDevice} />
            <View style={{ marginTop: 10 }}>
              <Button
                title="ยกเลิก"
                color="red"
                onPress={() => setModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  control: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  deviceName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  noDevices: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 18,
    color: "gray",
  },
  footerContainer: {
    marginTop: "auto",
    marginBottom: 20,
    alignItems: "center",
  },
  webSocketError: {
    textAlign: "center",
    color: "red",
    marginVertical: 10,
    fontSize: 16,
  },
  deviceCode: {
    fontSize: 14,
    color: "gray",
  },
  deviceCodeText: {
    fontSize: 14,
    color: "gray",
  },
  editDeleteButtons: {
    flexDirection: "row",
    marginTop: 5,
    gap: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  input: {
    borderBottomWidth: 1,
    width: 250,
    marginVertical: 10,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 5,
  },
});

export default RoomControlScreen;
