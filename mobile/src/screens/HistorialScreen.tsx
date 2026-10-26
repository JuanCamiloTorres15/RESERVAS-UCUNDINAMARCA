import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { ReservaDetalle, ReservaHistorial, reservasApi } from "../services/api";
import { COLORS } from "../theme/colors";

export default function HistorialScreen() {
  const [reservas, setReservas] = useState<ReservaDetalle[]>([]);
  const [reservaId, setReservaId] = useState<number | null>(null);
  const [historial, setHistorial] = useState<ReservaHistorial[]>([]);
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    reservasApi.listar()
      .then((lista) => {
        if (!activo) return;
        setReservas(lista);
        if (lista.length) setReservaId(lista[0].id);
      })
      .catch(() => { if (activo) setError("No se pudieron cargar las reservas."); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  const cargarHistorial = useCallback(async () => {
    if (reservaId === null) return;
    try {
      const [eventos, detalle] = await Promise.all([
        reservasApi.historial(reservaId),
        reservasApi.obtener(reservaId),
      ]);
      setHistorial(eventos);
      setFecha(detalle.fecha);
      setHoraInicio(detalle.hora_inicio.slice(0, 5));
      setHoraFin(detalle.hora_fin.slice(0, 5));
      setError("");
    } catch {
      setError("No se pudo cargar el historial de esta reserva.");
    }
  }, [reservaId]);

  useEffect(() => { void cargarHistorial(); }, [cargarHistorial]);

  async function reprogramar() {
    if (reservaId === null || !fecha || !horaInicio || !horaFin) {
      Alert.alert("Faltan datos", "Completa la fecha y el horario.");
      return;
    }
    setGuardando(true);
    try {
      await reservasApi.reprogramar(reservaId, {
        fecha,
        hora_inicio: horaInicio.length === 5 ? `${horaInicio}:00` : horaInicio,
        hora_fin: horaFin.length === 5 ? `${horaFin}:00` : horaFin,
      });
      await cargarHistorial();
      Alert.alert("Reserva reprogramada", "El nuevo horario quedó registrado en el historial.");
    } catch (e: any) {
      Alert.alert("No se pudo reprogramar", e?.response?.data?.detail ?? "Revisa la fecha y el horario.");
    } finally {
      setGuardando(false);
    }
  }

  const seleccionada = reservas.find((reserva) => reserva.id === reservaId);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <Text style={styles.titulo}>Historial y reprogramación</Text>
      <Text style={styles.subtitulo}>Consulta los cambios registrados para una reserva.</Text>

      <Text style={styles.etiqueta}>Reserva</Text>
      <View style={styles.selector}>
        {cargando ? <ActivityIndicator color={COLORS.primary} /> : reservas.length ? (
          <Picker selectedValue={reservaId} onValueChange={(valor) => setReservaId(valor)}>
            {reservas.map((reserva) => (
              <Picker.Item key={reserva.id} value={reserva.id}
                label={`#${reserva.id} · ${reserva.espacio.nombre} · ${reserva.fecha}`} />
            ))}
          </Picker>
        ) : <Text style={styles.vacio}>No hay reservas registradas.</Text>}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {(seleccionada?.estado === "pendiente" || seleccionada?.estado === "confirmada") ? (
        <View style={styles.tarjeta}>
          <Text style={styles.tituloTarjeta}>Reprogramar reserva</Text>
          <Text style={styles.ayuda}>Fecha (AAAA-MM-DD)</Text>
          <TextInput style={styles.input} value={fecha} onChangeText={setFecha} placeholder="2026-10-20" />
          <View style={styles.filaCampos}>
            <View style={styles.campo}>
              <Text style={styles.ayuda}>Inicio (HH:MM)</Text>
              <TextInput style={styles.input} value={horaInicio} onChangeText={setHoraInicio} placeholder="18:00" />
            </View>
            <View style={styles.campo}>
              <Text style={styles.ayuda}>Fin (HH:MM)</Text>
              <TextInput style={styles.input} value={horaFin} onChangeText={setHoraFin} placeholder="19:00" />
            </View>
          </View>
          <TouchableOpacity disabled={guardando} style={styles.boton} onPress={() => void reprogramar()}>
            <Text style={styles.textoBoton}>{guardando ? "Guardando…" : "Guardar nuevo horario"}</Text>
          </TouchableOpacity>
        </View>
      ) : seleccionada ? (
        <Text style={styles.nota}>Las reservas canceladas o completadas no pueden reprogramarse.</Text>
      ) : null}

      <View style={styles.tarjeta}>
        <Text style={styles.tituloTarjeta}>Línea de tiempo</Text>
        {historial.length === 0 ? (
          <Text style={styles.vacio}>Esta reserva aún no tiene cambios en el historial.</Text>
        ) : (
          historial.map((item, index) => (
            <View key={item.id} style={styles.evento}>
              <View style={styles.eje}>
                <View style={styles.circulo} />
                {index < historial.length - 1 ? <View style={styles.lineaVertical} /> : null}
              </View>
              <View style={styles.detalleEvento}>
                <Text style={styles.estado}>{item.estado_nuevo}</Text>
                <Text style={styles.transicion}>{item.estado_anterior} → {item.estado_nuevo}</Text>
                <Text style={styles.fechaEvento}>{new Date(item.fecha_cambio).toLocaleString("es-CO")}</Text>
              </View>
            </View>
          ))
        )}
      </View>
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
  etiqueta: { color: COLORS.textDark, fontSize: 13, fontWeight: "600", marginBottom: 5 },
  selector: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, minHeight: 50, justifyContent: "center", marginBottom: 12, overflow: "hidden" },
  tarjeta: { backgroundColor: COLORS.card, borderRadius: 12, borderColor: COLORS.border, borderWidth: 1, padding: 15, marginBottom: 13 },
  tituloTarjeta: { color: COLORS.primary, fontSize: 15, fontWeight: "700", marginBottom: 10 },
  ayuda: { color: COLORS.textGray, fontSize: 12, fontWeight: "600", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, color: COLORS.textDark, marginBottom: 9 },
  filaCampos: { flexDirection: "row", gap: 10 },
  campo: { flex: 1 },
  boton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 3 },
  textoBoton: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  evento: { flexDirection: "row", minHeight: 76 },
  eje: { width: 24, alignItems: "center" },
  circulo: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.accent, marginTop: 4, zIndex: 1 },
  lineaVertical: { width: 2, flex: 1, backgroundColor: COLORS.border, marginTop: -1 },
  detalleEvento: { flex: 1, paddingLeft: 9, paddingBottom: 15 },
  estado: { color: COLORS.textDark, fontSize: 14, fontWeight: "700" },
  transicion: { color: COLORS.textGray, fontSize: 12, marginTop: 3 },
  fechaEvento: { color: COLORS.textGray, fontSize: 11, marginTop: 5 },
  vacio: { color: COLORS.textGray, fontSize: 13, textAlign: "center", padding: 15 },
  error: { color: "#A33B35", fontSize: 13, marginBottom: 10 },
  nota: { color: COLORS.textGray, fontSize: 12, marginBottom: 12 },
});
