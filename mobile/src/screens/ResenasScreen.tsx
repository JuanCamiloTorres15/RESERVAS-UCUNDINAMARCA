import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Espacio, espaciosApi, ResenasEspacio, resenasApi } from "../services/api";
import { COLORS } from "../theme/colors";

export default function ResenasScreen() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espacioId, setEspacioId] = useState<number | null>(null);
  const [resumen, setResumen] = useState<ResenasEspacio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoResenas, setCargandoResenas] = useState(false);

  useEffect(() => {
    espaciosApi.listar()
      .then((lista) => {
        setEspacios(lista);
        if (lista.length) setEspacioId(lista[0].id);
      })
      .catch(() => Alert.alert("Error", "No se pudieron cargar los espacios deportivos."))
      .finally(() => setCargando(false));
  }, []);

  const cargarResenas = useCallback(async () => {
    if (espacioId === null) return;
    setCargandoResenas(true);
    try {
      setResumen(await resenasApi.listarPorEspacio(espacioId));
    } catch {
      setResumen(null);
      Alert.alert("Error", "No se pudieron cargar las reseñas del espacio.");
    } finally {
      setCargandoResenas(false);
    }
  }, [espacioId]);

  useEffect(() => { void cargarResenas(); }, [cargarResenas]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <Text style={styles.titulo}>Reseñas y calificaciones</Text>
      <Text style={styles.subtitulo}>Opiniones de usuarios con reservas completadas</Text>

      {cargando ? <ActivityIndicator size="large" color={COLORS.primary} /> : espacios.length === 0 ? (
        <Text style={styles.vacio}>No hay espacios registrados.</Text>
      ) : (
        <>
          <Text style={styles.etiqueta}>Espacios deportivos</Text>
          {espacios.map((espacio) => (
            <TouchableOpacity
              key={espacio.id}
              style={[styles.espacio, espacio.id === espacioId && styles.espacioSeleccionado]}
              onPress={() => setEspacioId(espacio.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre}>{espacio.nombre}</Text>
                <Text style={styles.tipo}>{espacio.tipo.split("_").join(" ")}</Text>
              </View>
              <Text style={styles.promedioEspacio}>
                {espacio.calificacion_promedio == null ? "—" : `★ ${espacio.calificacion_promedio.toFixed(1)}`}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.tarjeta}>
            {cargandoResenas ? <ActivityIndicator color={COLORS.primary} /> : resumen ? (
              <>
                <Text style={styles.tituloTarjeta}>Calificación promedio</Text>
                <Text style={styles.promedioGrande}>
                  {resumen.promedio == null ? "Sin calificaciones" : `★ ${resumen.promedio.toFixed(2)} / 5`}
                </Text>
                <Text style={styles.total}>{resumen.total} {resumen.total === 1 ? "reseña" : "reseñas"}</Text>
                {resumen.resenas.map((resena) => (
                  <View key={resena.id} style={styles.resena}>
                    <Text style={styles.estrellas}>{"★".repeat(resena.calificacion)}{"☆".repeat(5 - resena.calificacion)}</Text>
                    <Text style={styles.comentario}>{resena.comentario || "Sin comentario."}</Text>
                    <Text style={styles.fecha}>{new Date(resena.fecha).toLocaleDateString("es-CO")}</Text>
                  </View>
                ))}
              </>
            ) : <Text style={styles.vacio}>No se pudo obtener el resumen de reseñas.</Text>}
          </View>
        </>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  pantalla: { flex: 1, backgroundColor: COLORS.bg },
  contenido: { padding: 16, paddingBottom: 32 },
  titulo: { color: COLORS.textDark, fontSize: 22, fontWeight: "700" },
  subtitulo: { color: COLORS.textGray, fontSize: 13, marginTop: 4, marginBottom: 16 },
  etiqueta: { color: COLORS.textDark, fontSize: 13, fontWeight: "700", marginBottom: 8 },
  espacio: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 8 },
  espacioSeleccionado: { borderColor: COLORS.primary, borderWidth: 2 },
  nombre: { color: COLORS.textDark, fontSize: 14, fontWeight: "700" },
  tipo: { color: COLORS.textGray, fontSize: 12, marginTop: 3 },
  promedioEspacio: { color: COLORS.primary, fontSize: 15, fontWeight: "700" },
  tarjeta: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 15, marginTop: 8 },
  tituloTarjeta: { color: COLORS.primary, fontSize: 14, fontWeight: "700" },
  promedioGrande: { color: COLORS.primary, fontSize: 23, fontWeight: "700", marginTop: 8 },
  total: { color: COLORS.textGray, fontSize: 12, marginBottom: 12 },
  resena: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: 12 },
  estrellas: { color: COLORS.accent, fontSize: 17, letterSpacing: 2 },
  comentario: { color: COLORS.textDark, fontSize: 13, lineHeight: 19, marginTop: 4 },
  fecha: { color: COLORS.textGray, fontSize: 11, marginTop: 5 },
  vacio: { color: COLORS.textGray, fontSize: 13, textAlign: "center", padding: 18 },
});
