#include <WiFi.h>
#include <ArduinoJson.h>
#include <WebSocketsClient.h>
#include <DHT.h>
#include <HardwareSerial.h>
#include <ModbusMaster.h>
#include <HTTPClient.h>

#define RELAY1_PIN 26
#define RELAY2_PIN 27
#define DHTPIN 21
#define DHTTYPE DHT11
#define MAX485_RX 16
#define MAX485_TX 17
#define MAX485_RE_DE 4

const char* ssid = "Mi 9T";
const char* password = "29488zone";
const char* websocket_host = "192.168.1.235";
const int websocket_port = 8080;
const String api_url = "http://192.168.1.235:3000/api/weather/insertWeatherData";

WebSocketsClient webSocket;
DHT dht(DHTPIN, DHTTYPE);
HardwareSerial mySerial(1);
ModbusMaster node;

float wind_speed = 0.0;

void preTransmission() {
  digitalWrite(MAX485_RE_DE, HIGH);
}

void postTransmission() {
  digitalWrite(MAX485_RE_DE, LOW);
}

void webSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
    switch (type) {
        case WStype_CONNECTED:
            Serial.println("Connected to WebSocket Server");
            break;
        case WStype_DISCONNECTED:
            Serial.println("Disconnected from WebSocket Server");
            break;
        case WStype_TEXT:
            Serial.printf("Message from Server: %s\n", payload);

            StaticJsonDocument<200> jsonDoc;
            DeserializationError error = deserializeJson(jsonDoc, payload);
            if (error) {
                Serial.println("Failed to parse JSON");
                return;
            }

            String device_code = jsonDoc["device_code"];
            String device_status = jsonDoc["device_status"];

            Serial.println("===========================");
            Serial.print("Received command -> Device: ");
            Serial.print(device_code);
            Serial.print(" | Status: ");
            Serial.println(device_status);

            // ควบคุม Relay
            if (device_code == "0tVRO") {
                digitalWrite(RELAY1_PIN, device_status == "ON" ? HIGH : LOW);
                Serial.printf("Relay 1 %s\n", device_status.c_str());
            } else if (device_code == "mqUDD") {
                digitalWrite(RELAY2_PIN, device_status == "ON" ? HIGH : LOW);
                Serial.printf("Relay 2 %s\n", device_status.c_str());
            } else {
                Serial.println("Unknown device_code received");
            }
            Serial.println("===========================");
            break;
    }
}

void sendDataToAPI(float temperature, float humidity, float wind_speed) {
  HTTPClient http;
  http.begin(api_url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> jsonDoc;
  jsonDoc["user_code"] = "XIAPj";
  jsonDoc["temperature"] = temperature;
  jsonDoc["humidity"] = humidity;
  jsonDoc["wind_speed"] = wind_speed;

  String jsonString;
  serializeJson(jsonDoc, jsonString);

  Serial.println("JSON Data Sent:");
  Serial.println(jsonString);

  int httpResponseCode = http.POST(jsonString);

  if (httpResponseCode > 0) {
    Serial.printf("HTTP POST Response code: %d\n", httpResponseCode);
    String response = http.getString();
    Serial.println("Response from Server:");
    Serial.println(response);
  } else {
    Serial.printf("HTTP POST failed, error: %d\n", httpResponseCode);
  }

  http.end();
}

void setup() {
  Serial.begin(115200);

  // ตั้งค่า Relay Pins
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  digitalWrite(RELAY1_PIN, LOW);
  digitalWrite(RELAY2_PIN, LOW);

  // เชื่อมต่อ WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
  }
  Serial.println("\n WiFi Connected!");

  // ตั้งค่า WebSocket
  webSocket.begin(websocket_host, websocket_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  // ตั้งค่า DHT11
  dht.begin();

  // ตั้งค่า Modbus
  mySerial.begin(4800, SERIAL_8N1, MAX485_RX, MAX485_TX);
  pinMode(MAX485_RE_DE, OUTPUT);
  digitalWrite(MAX485_RE_DE, LOW);
  node.begin(1, mySerial);
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);
}

void loop() {
  // เชื่อมต่อ WebSocket ใหม่หากเชื่อมต่อหลุด
  if (WiFi.status() == WL_CONNECTED) {
    webSocket.loop();
  }

  // อ่านข้อมูลจาก DHT11 ทุกๆ 2 วินาที
  static unsigned long lastDHTTime = 0;
  if (millis() - lastDHTTime >= 2000) {
    lastDHTTime = millis();
    
    // อ่านอุณหภูมิและความชื้นจาก DHT11
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    // ตรวจสอบการอ่าน DHT11
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("Failed to read from DHT sensor!");
    } else {
      Serial.print("Humidity: ");
      Serial.print(humidity);
      Serial.print(" %\t");
      Serial.print("Temperature: ");
      Serial.print(temperature);
      Serial.println(" °C");
    }

    // อ่านข้อมูลความเร็วลมจาก Modbus RTU
    uint8_t result = node.readHoldingRegisters(0, 1);
    if (result == node.ku8MBSuccess) {
      wind_speed = node.getResponseBuffer(0) / 10.0;
      Serial.print("Wind Speed: ");
      Serial.print(wind_speed);
      Serial.println(" m/s");
    } else {
      Serial.println("Failed to read wind speed from Modbus sensor!");
    }
    // ส่งข้อมูลไปยัง API
    sendDataToAPI(temperature, humidity, wind_speed);

    StaticJsonDocument<200> jsonDoc;

    String user_code = "XIAPj";

    jsonDoc["user_code"] = user_code;
    jsonDoc["temperature"] = temperature;
    jsonDoc["humidity"] = humidity;
    jsonDoc["wind_speed"] = wind_speed;

    // แปลง JSON เป็น String
    String jsonString;
    serializeJson(jsonDoc, jsonString);

    // ส่งข้อมูลไป WebSocket
    if (webSocket.isConnected()) {
      webSocket.sendTXT(jsonString);
      Serial.println(" Sent data to WebSocket: ");
      Serial.println(jsonString);
    } else {
      Serial.println(" WebSocket not connected");
    }
  }
}
