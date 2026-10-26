import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AxiosError } from "axios";
import { ReporteResumen, reportesApi } from "../services/api";

const nombresTipo: Record<string, string> = {
  cancha_futbol: "Cancha de fútbol",
  cancha_baloncesto: "Cancha de baloncesto",
  cancha_tenis: "Cancha de tenis",
  piscina: "Piscina",
  gimnasio: "Gimnasio",
};

const formatoMoneda = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function ReportesScreen() {
  const [reporte, setReporte] = useState<ReporteResumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarReporte = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setReporte(await reportesApi.obtenerResumen());
    } catch (err) {
      const axiosError = err as AxiosError;
      setError(axiosError.response
        ? "No se pudo cargar el resumen. Intenta nuevamente."
        : "No fue posible conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargarReporte(); }, [cargarReporte]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Reportes y estadísticas</Text>
        <Text style={styles.subtitle}>Resumen general de reservas y espacios deportivos</Text>

        {cargando ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#176B4D" />
            <Text style={styles.helper}>Cargando estadísticas…</Text>
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <Text style={styles.retry} onPress={() => void cargarReporte()}>Toca para reintentar</Text>
          </View>
        ) : reporte ? (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>Espacio más reservado</Text>
              <Text style={styles.value}>{reporte.espacio_mas_reservado}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Ingresos totales aprobados</Text>
              <Text style={styles.money}>{formatoMoneda.format(reporte.ingresos_totales)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Ocupación por tipo</Text>
              {Object.entries(reporte.ocupacion_por_tipo).length === 0 ? (
                <Text style={styles.helper}>Aún no hay reservas para calcular la ocupación.</Text>
              ) : Object.entries(reporte.ocupacion_por_tipo).map(([tipo, porcentaje]) => {
                const valorSeguro = Math.max(0, Math.min(100, porcentaje));
                return (
                  <View key={tipo} style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>{nombresTipo[tipo] ?? tipo}</Text>
                      <Text style={styles.percent}>{valorSeguro.toFixed(1)}%</Text>
                    </View>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${valorSeguro}%` }]} />
                    </View>
                  </View>
                );
              })}
              <Text style={styles.footnote}>Distribución estimada de reservas confirmadas y completadas.</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F5F5" },
  scroll: { flex: 1, padding: 16 },
  content: { paddingBottom: 20 },
  title: { color: "#173B2E", fontSize: 24, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#68776F", fontSize: 14, lineHeight: 20, marginBottom: 20 },
  center: { paddingVertical: 48, alignItems: "center" },
  helper: { color: "#68776F", fontSize: 14, marginTop: 12 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: "#E5ECE7", shadowColor: "#183B2E", shadowOpacity: 0.05,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  label: { color: "#68776F", fontSize: 14, fontWeight: "500", marginBottom: 8 },
  value: { color: "#173B2E", fontSize: 21, fontWeight: "700" },
  money: { color: "#176B4D", fontSize: 25, fontWeight: "700" },
  sectionTitle: { color: "#173B2E", fontSize: 17, fontWeight: "700", marginBottom: 18 },
  progressItem: { marginBottom: 16 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  progressLabel: { color: "#34463C", fontSize: 14 },
  percent: { color: "#176B4D", fontSize: 14, fontWeight: "700" },
  track: { height: 9, borderRadius: 8, backgroundColor: "#E7EEE9", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 8, backgroundColor: "#2F9B6D" },
  footnote: { color: "#829087", fontSize: 12, marginTop: 3 },
  error: { color: "#A33B35", fontSize: 14 },
  retry: { color: "#176B4D", fontSize: 14, fontWeight: "700", marginTop: 12 },
});
