import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Notificacion, notificacionesApi, Usuario, usuariosApi } from "../services/api";
import { COLORS } from "../theme/colors";

const INTERVALO_MS = 15000;

export default function NotificacionesScreen() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [cargandoAvisos, setCargandoAvisos] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    usuariosApi.listar()
      .then((lista) => {
        if (activo) {
          setUsuarios(lista);
          if (lista.length) setUsuarioId(lista[0].id);
        }
      })
      .catch(() => { if (activo) setError("No se pudo cargar la lista de usuarios."); })
      .finally(() => { if (activo) setCargandoUsuarios(false); });
    return () => { activo = false; };
  }, []);

  const cargarNotificaciones = useCallback(async () => {
    if (usuarioId === null) return;
    try {
      setError("");
      setCargandoAvisos(true);
      setNotificaciones(await notificacionesApi.listarPorUsuario(usuarioId));
    } catch {
      setError("No se pudieron actualizar las notificaciones.");
    } finally {
      setCargandoAvisos(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    if (usuarioId === null) return;
    void cargarNotificaciones();
    const intervalo = setInterval(() => { void cargarNotificaciones(); }, INTERVALO_MS);
    return () => clearInterval(intervalo);
  }, [usuarioId, cargarNotificaciones]);

  const fechaLegible = (valor: string) => {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? valor : fecha.toLocaleString("es-CO");
  };

  return (
    <SafeAreaView style={styles.contenedor} edges={["top"]}>
      <Text style={styles.titulo}>Notificaciones</Text>
      <Text style={styles.subtitulo}>Actualización automática cada 15 segundos</Text>

      <Text style={styles.etiqueta}>Usuario</Text>
      <View style={styles.selector}>
        {cargandoUsuarios ? <ActivityIndicator color={COLORS.primary} /> : usuarios.length ? (
          <Picker selectedValue={usuarioId} onValueChange={(valor) => setUsuarioId(valor)}>
            {usuarios.map((usuario) => (
              <Picker.Item key={usuario.id} label={usuario.nombre} value={usuario.id} />
            ))}
          </Picker>
        ) : <Text style={styles.vacio}>No hay usuarios disponibles.</Text>}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {cargandoAvisos && notificaciones.length === 0 ? (
        <ActivityIndicator style={styles.cargando} size="large" color={COLORS.primary} />
      ) : (
        <FlatList
          data={notificaciones}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={<Text style={styles.vacio}>No hay notificaciones para este usuario.</Text>}
          renderItem={({ item }) => (
            <View style={styles.tarjeta}>
              <View style={styles.cabeceraTarjeta}>
                <Text style={styles.avisoTitulo}>Aviso de reserva</Text>
                <Text style={styles.fecha}>{fechaLegible(item.fecha)}</Text>
              </View>
              <Text style={styles.mensaje}>{item.mensaje}</Text>
              {item.reserva_id ? <Text style={styles.reserva}>Reserva #{item.reserva_id}</Text> : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  titulo: { color: COLORS.textDark, fontSize: 23, fontWeight: "700" },
  subtitulo: { color: COLORS.textGray, fontSize: 13, marginTop: 4, marginBottom: 16 },
  etiqueta: { color: COLORS.textDark, fontSize: 13, fontWeight: "600", marginBottom: 5 },
  selector: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, minHeight: 50, justifyContent: "center", marginBottom: 10, overflow: "hidden" },
  lista: { paddingTop: 4, paddingBottom: 20, gap: 10 },
  tarjeta: { backgroundColor: COLORS.card, borderRadius: 12, borderColor: COLORS.border, borderWidth: 1, padding: 14 },
  cabeceraTarjeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  avisoTitulo: { color: COLORS.primary, fontSize: 14, fontWeight: "700", flexShrink: 1 },
  fecha: { color: COLORS.textGray, fontSize: 11, textAlign: "right" },
  mensaje: { color: COLORS.textDark, fontSize: 14, lineHeight: 20 },
  reserva: { color: COLORS.textGray, fontSize: 12, marginTop: 8 },
  vacio: { color: COLORS.textGray, fontSize: 14, textAlign: "center", padding: 18 },
  error: { color: "#A33B35", fontSize: 13, marginBottom: 8 },
  cargando: { marginTop: 32 },
});
