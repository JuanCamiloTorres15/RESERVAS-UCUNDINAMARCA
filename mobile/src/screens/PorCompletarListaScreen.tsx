import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import EncabezadoInstitucional from "../components/EncabezadoInstitucional";
import { COLORS } from "../theme/colors";
import { PorCompletarStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<PorCompletarStackParamList, "PorCompletarLista">;

const ITEMS: { screen: keyof PorCompletarStackParamList; numero: string; titulo: string; resumen: string }[] = [
  { screen: "Reportes", numero: "5", titulo: "Reportes y Estadísticas", resumen: "Dashboard con ingresos y ocupación" },
  { screen: "Notificaciones", numero: "6", titulo: "Notificaciones", resumen: "Avisos de cambios de estado" },
  { screen: "Historial", numero: "7", titulo: "Historial y Reprogramación", resumen: "Línea de tiempo de la reserva" },
  { screen: "Resenas", numero: "8", titulo: "Reseñas y Calificaciones", resumen: "Calificación de espacios deportivos" },
];

export default function PorCompletarListaScreen({ navigation }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <EncabezadoInstitucional titulo="Por completar" subtitulo="Requerimientos propuestos al estudiante" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {ITEMS.map((item) => (
          <TouchableOpacity key={item.screen} style={styles.card} onPress={() => navigation.navigate(item.screen as any)}>
            <View style={styles.numero}>
              <Text style={styles.numeroTexto}>{item.numero}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo}>{item.titulo}</Text>
              <Text style={styles.resumen}>{item.resumen}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, flexDirection: "row", alignItems: "center", gap: 12,
  },
  numero: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  numeroTexto: { color: COLORS.primaryDark, fontWeight: "800", fontSize: 15 },
  titulo: { fontSize: 14.5, fontWeight: "700", color: COLORS.textDark },
  resumen: { fontSize: 12, color: COLORS.textGray, marginTop: 2 },
});
