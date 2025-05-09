import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";

export default function WeatherScreen({ userId, token }) {
  const [temperature, setTemperature] = useState("--");
  const [humidity, setHumidity] = useState("--");
  const [wind_speed, setwind_speed] = useState("--");
  const [forecastText, setForecastText] = useState("--");
  const wsRef = useRef(null);

  const fetchForecastText = async () => {
    try {
      const response = await fetch(
        "http://192.168.1.235:3000/api/weather/getForecastText"
      );
      const data = await response.json();
      if (response.ok) {
        setForecastText(data.forecast_text);
      } else {
        console.warn("Error fetching forecast text:", data.message);
      }
    } catch (error) {
      console.error("Error fetching forecast text:", error);
    }
  };

  useEffect(() => {
    fetchForecastText();
    const interval = setInterval(fetchForecastText, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const connectWebSocket = () => {
      if (wsRef.current) {
        console.warn("WebSocket is already open!");
        return;
      }

      console.log("Connecting WebSocket...");
      const socket = new WebSocket("ws://192.168.1.235:8080");

      socket.onopen = () => {
        console.log("WebSocket Connected");
        wsRef.current = socket;
      };

      socket.onmessage = async (event) => {
        try {
          let jsonString;
          if (event.data instanceof Blob) {
            jsonString = await event.data.text();
          } else if (event.data instanceof ArrayBuffer) {
            jsonString = new TextDecoder().decode(event.data);
          } else if (typeof event.data === "string") {
            jsonString = event.data;
          } else {
            console.warn("⚠️ Data type not handled:", typeof event.data);
            return;
          }

          console.log("📩 Received data:", jsonString);

          if (jsonString.startsWith("{") && jsonString.endsWith("}")) {
            const data = JSON.parse(jsonString);

            if (
              typeof data.temperature === "number" &&
              typeof data.humidity === "number" &&
              typeof data.wind_speed === "number"
            ) {
              console.log(" Valid data:", data);
              setTemperature(data.temperature);
              setHumidity(data.humidity);
              setwind_speed(data.wind_speed);
            } else {
              console.warn("Invalid data format:", data);
            }
          } else {
            console.warn("Invalid JSON format:", jsonString);
          }
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      };

      socket.onclose = () => {
        console.warn("WebSocket Disconnected, retrying in 3 seconds...");
        wsRef.current = null;
        setTimeout(connectWebSocket, 3000);
      };

      socket.onerror = (error) => {};
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        console.log("Closing WebSocket...");
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📡 ข้อมูลสภาพอากาศ</Text>
      <Text style={styles.text}>🌡️ อุณหภูมิ: {temperature}°C</Text>
      <View style={styles.spacing} />
      <Text style={styles.text}>💧 ความชื้น: {humidity}%</Text>
      <View style={styles.spacing} />
      <Text style={styles.text}>🌬️ แรงลม: {wind_speed} m/s</Text>
      <View style={styles.spacing} />
      <Text style={styles.text}>🌦️ มีโอกาศมากที่ฝนจะ: {forecastText} </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
  },
  text: {
    fontSize: 22,
  },
  spacing: {
    height: 15,
  },
});
