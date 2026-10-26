import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../theme/colors";

interface Props {
  titulo: string;
  subtitulo?: string;
}

export default function EncabezadoInstitucional({ titulo, subtitulo }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.contenedor, { paddingTop: insets.top > 0 ? insets.top + 10 : 20 }]}>
      <Image source={require("../theme/escudo.png")} style={styles.escudo} />
      <View style={{ flex: 1 }}>
        <Text style={styles.titulo}>{titulo}</Text>
        {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  escudo: { width: 36, height: 36, borderRadius: 18 },
  titulo: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  subtitulo: { color: COLORS.accentLight, fontSize: 12, marginTop: 2 },
});
