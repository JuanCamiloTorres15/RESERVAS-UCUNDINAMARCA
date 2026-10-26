import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ScrollView, Alert, RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import EncabezadoInstitucional from "../components/EncabezadoInstitucional";
import EtiquetaEstado from "../components/EtiquetaEstado";
import { COLORS } from "../theme/colors";
import { espaciosApi, Espacio, TipoEspacio } from "../services/api";

const TIPOS: { value: TipoEspacio; label: string }[] = [
  { value: "cancha_futbol", label: "Cancha de fútbol" },
  { value: "cancha_baloncesto", label: "Cancha de baloncesto" },
  { value: "cancha_tenis", label: "Cancha de tenis" },
  { value: "piscina", label: "Piscina" },
  { value: "gimnasio", label: "Gimnasio" },
];

export default function EspaciosScreen() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoEspacio>("cancha_futbol");
  const [ubicacion, setUbicacion] = useState("");
  const [capacidad, setCapacidad] = useState("1");
  const [precioHora, setPrecioHora] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await espaciosApi.listar();
      setEspacios(data);
    } catch (e) {
      Alert.alert("Error", "No se pudo cargar el listado de espacios.");
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
      // El tab navigator mantiene esta pantalla montada al cambiar de pestaña,
      // así que si el modal quedó abierto hay que cerrarlo al perder el foco
      // (si no, quedaría flotando por encima de las demás pestañas).
      return () => setModalVisible(false);
    }, [cargar])
  );

  async function guardar() {
    if (!nombre.trim() || !precioHora.trim()) {
      Alert.alert("Faltan datos", "Nombre y precio por hora son obligatorios.");
      return;
    }
    try {
      await espaciosApi.crear({
        nombre,
        tipo,
        ubicacion: ubicacion || undefined,
        capacidad: parseInt(capacidad || "1", 10),
        precio_hora: parseFloat(precioHora),
      });
      setModalVisible(false);
      setNombre(""); setUbicacion(""); setCapacidad("1"); setPrecioHora(""); setTipo("cancha_futbol");
      cargar();
    } catch (e) {
      Alert.alert("Error", "No se pudo registrar el espacio.");
    }
  }

  async function darDeBaja(espacio: Espacio) {
    Alert.alert(
      "Dar de baja",
      `¿Confirma dar de baja "${espacio.nombre}"? El registro no se elimina, solo cambia su estado.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Dar de baja",
          style: "destructive",
          onPress: async () => {
            await espaciosApi.darDeBaja(espacio.id);
            cargar();
          },
        },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <EncabezadoInstitucional titulo="Espacios Deportivos" subtitulo="Requerimiento 1 · CRUD de espacios" />
      <FlatList
        data={espacios}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
        ListEmptyComponent={
          !cargando ? <Text style={styles.vacio}>Aún no hay espacios registrados.</Text> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onLongPress={() => darDeBaja(item)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre}>{item.nombre}</Text>
              <Text style={styles.detalle}>
                {TIPOS.find((t) => t.value === item.tipo)?.label} · {item.ubicacion || "Sin ubicación"}
              </Text>
              <Text style={styles.precio}>${item.precio_hora.toLocaleString("es-CO")} / hora · Cap. {item.capacidad}</Text>
              <Text style={styles.detalle}>
                Calificación: {item.calificacion_promedio == null ? "Sin reseñas" : `★ ${item.calificacion_promedio.toFixed(1)} / 5`}
              </Text>
            </View>
            <EtiquetaEstado estado={item.estado} />
          </TouchableOpacity>
        )}
      />
      <Text style={styles.ayuda}>Mantén presionado un espacio para darlo de baja.</Text>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabTexto}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <ScrollView>
              <Text style={styles.modalTitulo}>Nuevo espacio deportivo</Text>

              <Text style={styles.label}>Nombre</Text>
              <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Ej. Cancha de fútbol 2" />

              <Text style={styles.label}>Tipo</Text>
              <View style={styles.pickerBox}>
                <Picker selectedValue={tipo} onValueChange={(v) => setTipo(v)}>
                  {TIPOS.map((t) => (
                    <Picker.Item key={t.value} label={t.label} value={t.value} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Ubicación</Text>
              <TextInput style={styles.input} value={ubicacion} onChangeText={setUbicacion} placeholder="Ej. Complejo deportivo, bloque A" />

              <Text style={styles.label}>Capacidad</Text>
              <TextInput style={styles.input} value={capacidad} onChangeText={setCapacidad} keyboardType="numeric" />

              <Text style={styles.label}>Precio por hora (COP)</Text>
              <TextInput style={styles.input} value={precioHora} onChangeText={setPrecioHora} keyboardType="numeric" placeholder="Ej. 60000" />

              <View style={styles.botones}>
                <TouchableOpacity style={styles.botonSecundario} onPress={() => setModalVisible(false)}>
                  <Text style={styles.botonSecundarioTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botonPrimario} onPress={guardar}>
                  <Text style={styles.botonPrimarioTexto}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  vacio: { textAlign: "center", color: COLORS.textGray, marginTop: 40 },
  ayuda: { textAlign: "center", color: COLORS.textGray, fontSize: 11, paddingBottom: 8 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, flexDirection: "row", alignItems: "center", gap: 10,
  },
  nombre: { fontSize: 15, fontWeight: "700", color: COLORS.textDark },
  detalle: { fontSize: 12.5, color: COLORS.textGray, marginTop: 2 },
  precio: { fontSize: 12.5, color: COLORS.primary, marginTop: 4, fontWeight: "600" },
  fab: {
    position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  fabTexto: { color: "#FFFFFF", fontSize: 28, lineHeight: 30 },
  modalFondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContenido: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, maxHeight: "88%" },
  modalTitulo: { fontSize: 17, fontWeight: "700", color: COLORS.textDark, marginBottom: 14 },
  label: { fontSize: 12.5, color: COLORS.textGray, marginTop: 10, marginBottom: 4, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  pickerBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: "hidden" },
  botones: { flexDirection: "row", gap: 10, marginTop: 22, marginBottom: 8 },
  botonSecundario: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  botonSecundarioTexto: { color: COLORS.textGray, fontWeight: "600" },
  botonPrimario: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center", backgroundColor: COLORS.primary },
  botonPrimarioTexto: { color: "#FFFFFF", fontWeight: "700" },
});
