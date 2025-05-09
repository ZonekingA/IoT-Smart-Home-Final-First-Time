import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import LobbyScreen from "./screens/LobbyScreen";
import RoomControlScreen from "./screens/RoomControlScreen";
import InsertRoomScreen from "./screens/RoomInsertScreen";
import DeviceInsert from "./screens/DeviceInsert";
import WeatherScreen from "./screens/WeatherScreen";

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen} 
          options={{ headerTitle: "Register" }} 
        />
        <Stack.Screen 
          name="Lobby" 
          component={LobbyScreen} 
          options={{ headerTitle: "Lobby" }} 
        />
        <Stack.Screen 
          name="RoomControl"
          component={RoomControlScreen} 
          options={({ route }) => ({ headerTitle: route.params?.roomName || "ห้อง" })} 
        />
        <Stack.Screen 
          name="InsertRoomScreen"
          component={InsertRoomScreen} 
        />
        <Stack.Screen 
          name="DeviceInsert"
          component={DeviceInsert} 
        />
        <Stack.Screen 
          name="WeatherScreen"
          component={WeatherScreen} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
