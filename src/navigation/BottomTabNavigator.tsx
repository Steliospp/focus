import React from "react";
import { View, TouchableOpacity } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HomeScreen } from "../screens/HomeScreen";
import { CalendarScreen } from "../screens/CalendarScreen";
import { JournalScreen } from "../screens/JournalScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { MascotOrb } from "../components/ui/MascotOrb";

const Tab = createBottomTabNavigator();

// Dummy screen — never rendered, the button navigates to AddTask in the root stack
function DummyScreen() {
  return <View style={{ flex: 1 }} />;
}

export function BottomTabNavigator() {
  const rootNav = useNavigation<NativeStackNavigationProp<any>>();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#FAF8F4",
          borderTopWidth: 1,
          borderTopColor: "#E7E5E4",
          height: 80,
          paddingBottom: 24,
          paddingTop: 12,
        },
        tabBarActiveTintColor: "#1C1917",
        tabBarInactiveTintColor: "#A8A29E",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="NewTask"
        component={DummyScreen}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            rootNav.navigate("AddTask");
          },
        }}
        options={{
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <TouchableOpacity
              onPress={props.onPress ?? undefined}
              onLongPress={props.onLongPress ?? undefined}
              activeOpacity={0.8}
              style={{
                top: -52,
                alignItems: "center",
                justifyContent: "center",
                width: 90,
                height: 90,
              }}
            >
              <MascotOrb mood="default" size={48} />
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen
        name="Journal"
        component={JournalScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="journal-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
