import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  FlatList,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../components/Header";

const LobbyScreen = ({ route, navigation }) => {
  const [users, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editRoomId, setEditRoomId] = useState(null);
  const [editRoomName, setEditRoomName] = useState("");
  const [userCode, setUserCode] = useState(""); // 🔹 เพิ่ม state สำหรับ user_code
  const { user, token } = route.params;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (token && user) {
          setUser(user);
          fetchRooms(token);
          fetchUserCode(user.user_id); // 🔹 เรียกใช้เมื่อโหลดข้อมูล
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, []);

  const fetchRooms = async (token) => {
    if (!token) {
      console.error("No token available");
      return;
    }
    try {
      const response = await axios.get(
        "http://192.168.1.235:3000/api/device/getRoomsWithDevices",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRooms(response.data);
    } catch (error) {
      console.error(
        "Error fetching rooms:",
        error.response?.data || error.message
      );
    }
  };

  const fetchUserCode = async (userId) => {
    try {
      const response = await axios.get(
        `http://192.168.1.235:3000/api/user/getusercode/${userId}`
      );
      setUserCode(response.data.user_code);
    } catch (error) {
      console.error("Error fetching user code:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchRooms(token);
    });
    return unsubscribe;
  }, [navigation, token]);

  const handleEditRoom = async () => {
    try {
      await axios.put(
        "http://192.168.1.235:3000/api/device/editroom",
        {
          room_id: editRoomId,
          room_name: editRoomName,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setModalVisible(false);
      fetchRooms(token);
    } catch (error) {
      console.error(
        "Error updating room:",
        error.response?.data || error.message
      );
    }
  };

  const handleDeleteRoom = (room_id) => {
    Alert.alert("ยืนยันการลบ", "คุณต้องการลบห้องนี้หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        onPress: async () => {
          try {
            await axios.delete(
              "http://192.168.1.235:3000/api/device/deleteroom",
              {
                data: { room_id },
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            fetchRooms(token);
          } catch (error) {
            console.error(
              "Error deleting room:",
              error.response?.data || error.message
            );
          }
        },
      },
    ]);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      navigation.replace("Login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (!users) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.room_id.toString()}
        ListHeaderComponent={
          <View>
            <Header title={`Welcome, ${users.name}`} />
            <Text style={styles.userCode}>รหัสผู้ใช้: {userCode}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.roomInfoContainer}>
            <View style={styles.roomInfoRow}>
              <Text style={styles.room}>{item.room_name}</Text>
              <Text style={styles.status}>การใช้งาน {item.status}</Text>
            </View>
            <View style={styles.buttonRow}>
              <Button
                title="View Devices"
                onPress={() =>
                  navigation.navigate("RoomControl", {
                    roomId: item.room_id,
                    roomName: item.room_name,
                    token,
                    user,
                    devices: item.devices,
                  })
                }
              />
              <View style={styles.editDeleteButtons}>
                <Button
                  title="Edit"
                  onPress={() => {
                    setEditRoomId(item.room_id);
                    setEditRoomName(item.room_name);
                    setModalVisible(true);
                  }}
                />
                <Button
                  title="Delete"
                  color="red"
                  onPress={() => handleDeleteRoom(item.room_id)}
                />
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footerWrapper}>
            <View style={styles.footerContainer}>
              <Button
                title="สภาพอากาศ"
                onPress={() =>
                  navigation.navigate("WeatherScreen", {
                    token,
                    user,
                  })
                }
              />
              <Button
                title="เพิ่มห้อง"
                onPress={() =>
                  navigation.navigate("InsertRoomScreen", {
                    token,
                    user,
                  })
                }
              />
            </View>
            <View style={styles.logoutContainer}>
              <Button title="Logout" color="red" onPress={handleLogout} />
            </View>
          </View>
        }
      />
      <Modal visible={modalVisible} animationType="slide" transparent>
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
              แก้ไขชื่อห้อง
            </Text>
            <TextInput
              value={editRoomName}
              onChangeText={setEditRoomName}
              style={styles.input}
            />
            <Button title="บันทึก" onPress={handleEditRoom} />
            <Button
              title="ยกเลิก"
              color="red"
              onPress={() => setModalVisible(false)}
            />
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
  roomInfoContainer: {
    marginBottom: 15,
  },
  roomInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  room: {
    fontSize: 20,
    marginVertical: 10,
  },
  status: {
    fontSize: 20,
    color: "gray",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  editDeleteButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "50%",
  },
  footerWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  logoutContainer: {
    marginTop: 40,
    alignItems: "center",
    paddingBottom: 20,
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
  userCode: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
    marginBottom: 10,
    textAlign: "center",
  },
});

export default LobbyScreen;
