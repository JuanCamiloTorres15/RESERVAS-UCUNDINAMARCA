import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../theme/colors";

const ETIQUETAS: Record<string, { color: string; texto: string }> = {
  pendiente: { color: COLORS.pendiente, texto: "Pendiente" },
  confirmada: { color: COLORS.confirmada, texto: "Confirmada" },
  cancelada: { color: COLORS.cancelada, texto: "Cancelada" },
  completada: { color: COLORS.completada, texto: "Completada" },
  disponible: { color: COLORS.disponible, texto: "Disponible" },
  mantenimiento: { color: COLORS.mantenimiento, texto: "En mantenimiento" },
  inactivo: { color: COLORS.inactivo, texto: "Inactivo" },
};

export default function EtiquetaEstado({ estado }: { estado: string }) {
  const info = ETIQUETAS[estado] ?? { color: COLORS.textGray, texto: estado };
  return (
    <View style={[styles.chip, { backgroundColor: info.color }]}>
      <Text style={styles.texto}>{info.texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: "flex-start" },
  texto: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
});
