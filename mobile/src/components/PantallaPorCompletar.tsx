import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import EncabezadoInstitucional from "./EncabezadoInstitucional";
import { COLORS } from "../theme/colors";

interface Props {
  titulo: string;
  requerimiento: string;
  descripcion: string;
  pistas: string[];
}

export default function PantallaPorCompletar({ titulo, requerimiento, descripcion, pistas }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <EncabezadoInstitucional titulo={titulo} subtitulo={requerimiento} />
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.badge}>
          <Text style={styles.badgeTexto}>Por completar — actividad del estudiante</Text>
        </View>
        <Text style={styles.descripcion}>{descripcion}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Pistas técnicas para implementarlo</Text>
          {pistas.map((p, i) => (
            <View key={i} style={styles.pistaFila}>
              <View style={styles.punto} />
              <Text style={styles.pistaTexto}>{p}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: 16, gap: 14 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accent,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeTexto: { color: COLORS.primaryDark, fontWeight: "700", fontSize: 12 },
  descripcion: { color: COLORS.textDark, fontSize: 15, lineHeight: 21 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderColor: COLORS.border,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardTitulo: { color: COLORS.primary, fontWeight: "700", fontSize: 15, marginBottom: 4 },
  pistaFila: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, marginTop: 6 },
  pistaTexto: { flex: 1, color: COLORS.textDark, fontSize: 13.5, lineHeight: 19 },
});
