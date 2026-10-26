import React from "react";
import { Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import EspaciosScreen from "./src/screens/EspaciosScreen";
import ReservasScreen from "./src/screens/ReservasScreen";
import ReservaDetalleScreen from "./src/screens/ReservaDetalleScreen";
import PorCompletarListaScreen from "./src/screens/PorCompletarListaScreen";
import ReportesScreen from "./src/screens/ReportesScreen";
import NotificacionesScreen from "./src/screens/NotificacionesScreen";
import HistorialScreen from "./src/screens/HistorialScreen";
import ResenasScreen from "./src/screens/ResenasScreen";
import { COLORS } from "./src/theme/colors";
import { ReservasStackParamList, PorCompletarStackParamList } from "./src/navigation/types";

const Tab = createBottomTabNavigator();
const ReservasStack = createNativeStackNavigator<ReservasStackParamList>();
const PorCompletarStack = createNativeStackNavigator<PorCompletarStackParamList>();

function ReservasStackNavigator() {
  return (
    <ReservasStack.Navigator screenOptions={{ headerShown: false }}>
      <ReservasStack.Screen name="ReservasLista" component={ReservasScreen} />
      <ReservasStack.Screen name="ReservaDetalle" component={ReservaDetalleScreen} />
    </ReservasStack.Navigator>
  );
}

function PorCompletarStackNavigator() {
  return (
    <PorCompletarStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F5F5F5" },
      }}
    >
      <PorCompletarStack.Screen name="PorCompletarLista" component={PorCompletarListaScreen} />
      <PorCompletarStack.Screen name="Reportes" component={ReportesScreen} />
      <PorCompletarStack.Screen name="Notificaciones" component={NotificacionesScreen} />
      <PorCompletarStack.Screen name="Historial" component={HistorialScreen} />
      <PorCompletarStack.Screen name="Resenas" component={ResenasScreen} />
    </PorCompletarStack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused, color, size }) => {
              const icon = route.name === "Espacios"
                ? "◉"
                : route.name === "Reservas"
                  ? focused ? "▣" : "▦"
                  : focused ? "✓" : "○";
              return <Text style={{ color, fontSize: size, fontWeight: "700", textAlign: "center" }}>{icon}</Text>;
            },
            tabBarActiveTintColor: "#006400",
            tabBarInactiveTintColor: "#222222",
            tabBarLabelStyle: { fontSize: 12, fontWeight: "700", color: undefined },
            tabBarStyle: {
              backgroundColor: "#FFFFFF",
              borderTopWidth: 1,
              borderTopColor: "#E0E0E0",
              height: 75,
              paddingTop: 10,
              paddingBottom: 15,
              position: "relative",
              elevation: 8,
            },
          })}
        >
          <Tab.Screen name="Espacios" component={EspaciosScreen} />
          <Tab.Screen name="Reservas" component={ReservasStackNavigator} />
          <Tab.Screen name="Por completar" component={PorCompletarStackNavigator} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
