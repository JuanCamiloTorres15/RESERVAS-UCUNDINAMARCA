import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Picker } from "@react-native-picker/picker";
import EncabezadoInstitucional from "../components/EncabezadoInstitucional";
import EtiquetaEstado from "../components/EtiquetaEstado";
import { COLORS } from "../theme/colors";
import { reservasApi, pagosApi, resenasApi, ReservaDetalle, ReservaHistorial, MetodoPago } from "../services/api";
import { ReservasStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<ReservasStackParamList, "ReservaDetalle">;

function horas(inicio: string, fin: string) {
  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  return (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
}

export default function ReservaDetalleScreen({ route }: Props) {
  const { id } = route.params;
  const [reserva, setReserva] = useState<ReservaDetalle | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("tarjeta");
  const [procesando, setProcesando] = useState(false);
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviandoResena, setEnviandoResena] = useState(false);
  const [yaReseno, setYaReseno] = useState(false);
  const [promedioEspacio, setPromedioEspacio] = useState<number | null>(null);
  const [historial, setHistorial] = useState<ReservaHistorial[]>([]);
  const [mostrarReprogramacion, setMostrarReprogramacion] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevaHoraInicio, setNuevaHoraInicio] = useState("");
  const [nuevaHoraFin, setNuevaHoraFin] = useState("");
  const [reprogramando, setReprogramando] = useState(false);

  const cargar = useCallback(async () => {
    const data = await reservasApi.obtener(id);
    setReserva(data);
  }, [id]);

  const cargarHistorial = useCallback(async () => {
    try {
      setHistorial(await reservasApi.obtenerHistorial(id));
    } catch {
      setHistorial([]);
    }
  }, [id]);

  useEffect(() => {
    void cargarHistorial();
  }, [cargarHistorial]);

  useEffect(() => {
    let activo = true;
    if (reserva?.estado !== "completada") return () => { activo = false; };
    Promise.all([
      resenasApi.listarPorEspacio(reserva.espacio_id),
      resenasApi.obtenerPromedio(reserva.espacio_id),
    ])
      .then(([datos, promedio]) => {
        if (!activo) return;
        setPromedioEspacio(promedio.total_resenas ? promedio.promedio : null);
        setYaReseno(datos.resenas.some((resena) => resena.reserva_id === reserva.id));
      })
      .catch(() => { if (activo) setPromedioEspacio(null); });
    return () => { activo = false; };
  }, [reserva?.estado, reserva?.espacio_id, reserva?.id]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  if (!reserva) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <EncabezadoInstitucional titulo="Reserva" />
        <Text style={{ padding: 20, color: COLORS.textGray }}>Cargando...</Text>
      </View>
    );
  }

  const montoEsperado = Math.round(reserva.espacio.precio_hora * horas(reserva.hora_inicio, reserva.hora_fin));

  async function cambiarEstado(nuevo: "confirmada" | "cancelada" | "completada") {
    setProcesando(true);
    try {
      await reservasApi.cambiarEstado(reserva!.id, nuevo);
      await cargar();
      await cargarHistorial();
    } catch (e: any) {
      Alert.alert("No se pudo cambiar el estado", e?.response?.data?.detail ?? "Error desconocido");
    } finally {
      setProcesando(false);
    }
  }

  async function pagar() {
    setProcesando(true);
    try {
      await pagosApi.registrar({ reserva_id: reserva!.id, metodo_pago: metodoPago, monto: montoEsperado });
      Alert.alert("Pago registrado", "El pago fue aprobado y la reserva quedó confirmada.");
      await cargar();
      await cargarHistorial();
    } catch (e: any) {
      Alert.alert("No se pudo registrar el pago", e?.response?.data?.detail ?? "Error desconocido");
    } finally {
      setProcesando(false);
    }
  }

  async function enviarResena() {
    if (estrellas < 1 || estrellas > 5) {
      Alert.alert("Selecciona una calificación", "Elige de una a cinco estrellas.");
      return;
    }
    setEnviandoResena(true);
    try {
      await resenasApi.crear({
        reserva_id: reserva!.id,
        calificacion: estrellas,
        comentario: comentario.trim(),
      });
      setYaReseno(true);
      Alert.alert("Reseña registrada", "Gracias por compartir tu opinión.");
      try {
        const resumen = await resenasApi.obtenerPromedio(reserva!.espacio_id);
        setPromedioEspacio(resumen.total_resenas ? resumen.promedio : null);
      } catch {
        // La reseña ya fue guardada; el promedio se actualizará al recargar.
      }
    } catch (e: any) {
      Alert.alert("No se pudo guardar la reseña", e?.response?.data?.detail ?? "Intenta nuevamente.");
    } finally {
      setEnviandoResena(false);
    }
  }

  function abrirFormularioReprogramacion() {
    setNuevaFecha(reserva!.fecha);
    setNuevaHoraInicio(reserva!.hora_inicio.slice(0, 5));
    setNuevaHoraFin(reserva!.hora_fin.slice(0, 5));
    setMostrarReprogramacion(true);
  }

  async function guardarReprogramacion() {
    if (!nuevaFecha || !nuevaHoraInicio || !nuevaHoraFin) {
      Alert.alert("Faltan datos", "Completa la fecha y las horas del nuevo horario.");
      return;
    }
    setReprogramando(true);
    try {
      await reservasApi.reprogramar(reserva!.id, {
        fecha: nuevaFecha,
        hora_inicio: nuevaHoraInicio.length === 5 ? `${nuevaHoraInicio}:00` : nuevaHoraInicio,
        hora_fin: nuevaHoraFin.length === 5 ? `${nuevaHoraFin}:00` : nuevaHoraFin,
      });
      setMostrarReprogramacion(false);
      await Promise.all([cargar(), cargarHistorial()]);
      Alert.alert("Horario actualizado", "La reserva fue reprogramada correctamente.");
    } catch (e: any) {
      Alert.alert("No se pudo reprogramar", e?.response?.data?.detail ?? "Verifica la fecha y disponibilidad del horario.");
    } finally {
      setReprogramando(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <EncabezadoInstitucional titulo={reserva.espacio.nombre} subtitulo={`Reserva #${reserva.id}`} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={styles.card}>
          <View style={styles.filaEntre}>
            <Text style={styles.tituloSeccion}>Datos de la reserva</Text>
            <EtiquetaEstado estado={reserva.estado} />
          </View>
          <Text style={styles.linea}>Fecha: {reserva.fecha}</Text>
          <Text style={styles.linea}>Horario: {reserva.hora_inicio.slice(0, 5)} - {reserva.hora_fin.slice(0, 5)}</Text>
          <Text style={styles.linea}>Solicitante: {reserva.usuario.nombre}</Text>
          <Text style={styles.linea}>Valor: ${montoEsperado.toLocaleString("es-CO")}</Text>
        </View>

        {/* Requerimiento 3 — gestión de estados */}
        <View style={styles.card}>
          <Text style={styles.tituloSeccion}>Gestión de estado (Requerimiento 3)</Text>
          <View style={styles.botonesFila}>
            {reserva.estado === "pendiente" && (
              <TouchableOpacity disabled={procesando} style={styles.botonPeligro} onPress={() => cambiarEstado("cancelada")}>
                <Text style={styles.botonPeligroTexto}>Cancelar reserva</Text>
              </TouchableOpacity>
            )}
            {reserva.estado === "confirmada" && (
              <>
                <TouchableOpacity disabled={procesando} style={styles.botonPeligro} onPress={() => cambiarEstado("cancelada")}>
                  <Text style={styles.botonPeligroTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={procesando} style={styles.botonPrimario} onPress={() => cambiarEstado("completada")}>
                  <Text style={styles.botonPrimarioTexto}>Marcar completada</Text>
                </TouchableOpacity>
              </>
            )}
            {(reserva.estado === "cancelada" || reserva.estado === "completada") && (
              <Text style={styles.notaEstado}>Este es un estado final; la reserva ya no admite más cambios.</Text>
            )}
          </View>
        </View>

        {/* Requerimiento 4 — pago */}
        {reserva.estado === "pendiente" && !reserva.pago && (
          <View style={styles.card}>
            <Text style={styles.tituloSeccion}>Registrar pago (Requerimiento 4)</Text>
            <Text style={styles.linea}>Monto a pagar: ${montoEsperado.toLocaleString("es-CO")}</Text>
            <Text style={styles.label}>Método de pago</Text>
            <View style={styles.pickerBox}>
              <Picker selectedValue={metodoPago} onValueChange={(v) => setMetodoPago(v)}>
                <Picker.Item label="Tarjeta" value="tarjeta" />
                <Picker.Item label="Transferencia" value="transferencia" />
                <Picker.Item label="Efectivo" value="efectivo" />
              </Picker>
            </View>
            <TouchableOpacity disabled={procesando} style={[styles.botonPrimario, { marginTop: 12 }]} onPress={pagar}>
              <Text style={styles.botonPrimarioTexto}>Pagar y confirmar reserva</Text>
            </TouchableOpacity>
          </View>
        )}

        {reserva.pago && (
          <View style={styles.card}>
            <Text style={styles.tituloSeccion}>Pago registrado</Text>
            <Text style={styles.linea}>Monto: ${reserva.pago.monto.toLocaleString("es-CO")}</Text>
            <Text style={styles.linea}>Método: {reserva.pago.metodo_pago}</Text>
            <Text style={styles.linea}>Estado: {reserva.pago.estado}</Text>
          </View>
        )}

        {reserva.estado === "completada" && (
          <View style={styles.tarjetaResena}>
            <Text style={styles.tituloSeccion}>Califica este espacio</Text>
            <Text style={styles.instruccion}>¿Qué tal te pareció el espacio deportivo?</Text>
            <Text style={styles.linea}>
              Promedio del espacio: {promedioEspacio === null ? "Aún sin calificaciones" : `${promedioEspacio.toFixed(1)} / 5`}
            </Text>
            {yaReseno ? (
              <Text style={styles.notaEstado}>Ya registraste una reseña para esta reserva. ¡Gracias!</Text>
            ) : (
              <>
                <View style={styles.contenedorEstrellas}>
                  {[1, 2, 3, 4, 5].map((estrella) => (
                    <TouchableOpacity
                      key={estrella}
                      accessibilityRole="button"
                      accessibilityLabel={`${estrella} ${estrella === 1 ? "estrella" : "estrellas"}`}
                      onPress={() => setEstrellas(estrella)}
                    >
                      <Text style={[styles.estrellaIcono, estrellas >= estrella ? styles.estrellaActiva : styles.estrellaInactiva]}>
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.inputComentario}
                  value={comentario}
                  onChangeText={setComentario}
                  placeholder="Cuéntanos cómo fue tu experiencia (opcional)"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <TouchableOpacity
                  disabled={enviandoResena || estrellas === 0}
                  style={[styles.botonEnviar, (enviandoResena || estrellas === 0) && styles.botonDeshabilitado]}
                  onPress={() => void enviarResena()}
                >
                  <Text style={styles.textoBoton}>{enviandoResena ? "Enviando…" : "Enviar Reseña"}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {(reserva.estado === "pendiente" || reserva.estado === "confirmada") && (
          <View style={styles.card}>
            {!mostrarReprogramacion ? (
              <TouchableOpacity style={styles.botonPrimario} onPress={abrirFormularioReprogramacion}>
                <Text style={styles.botonPrimarioTexto}>Reprogramar horario</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.tituloSeccion}>Nuevo horario</Text>
                <Text style={styles.label}>Fecha (AAAA-MM-DD)</Text>
                <TextInput style={styles.campoReprogramacion} value={nuevaFecha} onChangeText={setNuevaFecha} placeholder="2026-10-20" />
                <View style={styles.filaReprogramacion}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Hora de inicio</Text>
                    <TextInput style={styles.campoReprogramacion} value={nuevaHoraInicio} onChangeText={setNuevaHoraInicio} placeholder="18:00" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Hora de fin</Text>
                    <TextInput style={styles.campoReprogramacion} value={nuevaHoraFin} onChangeText={setNuevaHoraFin} placeholder="19:00" />
                  </View>
                </View>
                <View style={styles.botonesFila}>
                  <TouchableOpacity disabled={reprogramando} style={styles.botonPeligro} onPress={() => setMostrarReprogramacion(false)}>
                    <Text style={styles.botonPeligroTexto}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={reprogramando} style={styles.botonPrimario} onPress={() => void guardarReprogramacion()}>
                    <Text style={styles.botonPrimarioTexto}>{reprogramando ? "Guardando…" : "Guardar horario"}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.seccionHistorial}>
          <Text style={styles.subtitulo}>Línea de Tiempo (Historial Auditoría)</Text>
          {historial.length === 0 ? (
            <Text style={styles.sinHistorial}>Aún no hay cambios registrados.</Text>
          ) : historial.map((h, index) => (
            <View key={h.id} style={styles.itemTimeline}>
              <View style={styles.columnaIndicador}>
                <View style={styles.circuloPunto} />
                {index < historial.length - 1 && <View style={styles.lineaVertical} />}
              </View>
              <View style={styles.contenidoTimeline}>
                <Text style={styles.textoCambio}>
                  Cambio: <Text style={{ fontWeight: "bold" }}>{h.estado_anterior}</Text> ➡️{" "}
                  <Text style={{ fontWeight: "bold", color: "#006400" }}>{h.estado_nuevo}</Text>
                </Text>
                <Text style={styles.textoFecha}>{new Date(h.fecha_cambio).toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    padding: 16, gap: 6,
  },
  filaEntre: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  tituloSeccion: { fontSize: 14.5, fontWeight: "700", color: COLORS.primary, marginBottom: 4 },
  linea: { fontSize: 13.5, color: COLORS.textDark },
  botonesFila: { flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" },
  botonPrimario: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: "center" },
  botonPrimarioTexto: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  botonPeligro: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 8, backgroundColor: COLORS.cancelada, alignItems: "center" },
  botonPeligroTexto: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  notaEstado: { color: COLORS.textGray, fontSize: 12.5, fontStyle: "italic" },
  label: { fontSize: 12.5, color: COLORS.textGray, marginTop: 6, marginBottom: 4, fontWeight: "600" },
  pickerBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: "hidden" },
  instruccion: { fontSize: 13, color: "#666666", marginBottom: 12 },
  contenedorEstrellas: { flexDirection: "row", justifyContent: "center", marginBottom: 15 },
  estrellaIcono: { fontSize: 36, marginHorizontal: 6 },
  estrellaActiva: { color: "#FFD700" },
  estrellaInactiva: { color: "#CCCCCC" },
  inputComentario: { backgroundColor: "#F9F9F9", padding: 10, borderRadius: 6, textAlignVertical: "top", borderWidth: 1, borderColor: "#DDDDDD", fontSize: 14, marginBottom: 12 },
  botonEnviar: { backgroundColor: "#006400", padding: 12, borderRadius: 6, alignItems: "center" },
  textoBoton: { color: "#FFFFFF", fontWeight: "bold", fontSize: 15 },
  botonDeshabilitado: { opacity: 0.55 },
  tarjetaResena: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 8, marginTop: 15, borderWidth: 1, borderColor: "#E0E0E0" },
  seccionHistorial: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 8, marginTop: 15 },
  subtitulo: { fontSize: 16, fontWeight: "bold", marginBottom: 12, color: "#333333" },
  itemTimeline: { flexDirection: "row", marginBottom: 15, minHeight: 54 },
  columnaIndicador: { alignItems: "center", marginRight: 12, width: 20 },
  circuloPunto: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#006400" },
  lineaVertical: { width: 2, flex: 1, backgroundColor: "#CCCCCC", marginTop: 4 },
  contenidoTimeline: { flex: 1, backgroundColor: "#F9F9F9", padding: 8, borderRadius: 6 },
  textoCambio: { fontSize: 14, color: "#444444" },
  textoFecha: { fontSize: 11, color: "#777777", marginTop: 4 },
  sinHistorial: { color: COLORS.textGray, fontSize: 13 },
  campoReprogramacion: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 14, color: COLORS.textDark },
  filaReprogramacion: { flexDirection: "row", gap: 10 },
});
