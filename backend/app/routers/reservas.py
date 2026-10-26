from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/reservas", tags=["reservas"])

# ------------------------------------------------------------
# Requerimiento 3 — máquina de estados de la Reserva
# ------------------------------------------------------------
TRANSICIONES_VALIDAS = {
    models.EstadoReserva.pendiente: {models.EstadoReserva.confirmada, models.EstadoReserva.cancelada},
    models.EstadoReserva.confirmada: {models.EstadoReserva.completada, models.EstadoReserva.cancelada},
    models.EstadoReserva.cancelada: set(),   # estado final
    models.EstadoReserva.completada: set(),  # estado final
}


def _cargar_relaciones(query):
    return query.options(
        joinedload(models.Reserva.espacio),
        joinedload(models.Reserva.usuario),
        joinedload(models.Reserva.pago),
    )


def _validar_solapamiento(db, espacio_id, fecha, hora_inicio, hora_fin, excluir_reserva_id=None):
    if hora_fin <= hora_inicio:
        raise HTTPException(400, "La hora de fin debe ser posterior a la hora de inicio")
    query = db.query(models.Reserva).filter(
        models.Reserva.espacio_id == espacio_id,
        models.Reserva.fecha == fecha,
        models.Reserva.estado.in_([models.EstadoReserva.pendiente, models.EstadoReserva.confirmada]),
    )
    if excluir_reserva_id is not None:
        query = query.filter(models.Reserva.id != excluir_reserva_id)
    for existente in query.all():
        if hora_inicio < existente.hora_fin and hora_fin > existente.hora_inicio:
            raise HTTPException(
                400,
                f"El espacio ya está reservado de {existente.hora_inicio} a {existente.hora_fin} en esa fecha",
            )


@router.get("/", response_model=list[schemas.ReservaDetalleOut])
def listar_reservas(estado: models.EstadoReserva | None = None, db: Session = Depends(get_db)):
    query = _cargar_relaciones(db.query(models.Reserva))
    if estado:
        query = query.filter(models.Reserva.estado == estado)
    return query.order_by(models.Reserva.fecha.desc(), models.Reserva.hora_inicio).all()


@router.get("/{reserva_id}", response_model=schemas.ReservaDetalleOut)
def obtener_reserva(reserva_id: int, db: Session = Depends(get_db)):
    reserva = _cargar_relaciones(db.query(models.Reserva)).filter(models.Reserva.id == reserva_id).first()
    if not reserva:
        raise HTTPException(404, "Reserva no encontrada")
    return reserva


# ------------------------------------------------------------
# Requerimiento 2 — creación de reservas, con validación de
# solapamiento de horario sobre el mismo espacio.
# ------------------------------------------------------------
@router.post("/", response_model=schemas.ReservaDetalleOut, status_code=201)
def crear_reserva(datos: schemas.ReservaCreate, db: Session = Depends(get_db)):
    espacio = db.get(models.EspacioDeportivo, datos.espacio_id)
    if not espacio:
        raise HTTPException(404, "Espacio no encontrado")
    if espacio.estado != models.EstadoEspacio.disponible:
        raise HTTPException(400, f"El espacio no está disponible (estado actual: {espacio.estado.value})")

    _validar_solapamiento(db, datos.espacio_id, datos.fecha, datos.hora_inicio, datos.hora_fin)

    usuario = db.get(models.Usuario, datos.usuario_id)
    if not usuario:
        raise HTTPException(404, "Usuario no encontrado")

    reserva = models.Reserva(**datos.model_dump(), estado=models.EstadoReserva.pendiente)
    db.add(reserva)
    db.flush()
    db.add(models.ReservaHistorial(
        reserva_id=reserva.id,
        estado_anterior="sin estado",
        estado_nuevo=reserva.estado.value,
    ))
    db.add(models.Notificacion(
        usuario_id=reserva.usuario_id,
        reserva_id=reserva.id,
        mensaje=f"Tu solicitud de reserva de {espacio.nombre} fue registrada y está pendiente de pago.",
    ))
    db.commit()
    db.refresh(reserva)


    return _cargar_relaciones(db.query(models.Reserva)).filter(models.Reserva.id == reserva.id).first()


@router.patch("/{reserva_id}/reprogramar", response_model=schemas.ReservaDetalleOut)
def reprogramar_reserva(reserva_id: int, datos: schemas.ReprogramarReservaInput, db: Session = Depends(get_db)):
    reserva = db.get(models.Reserva, reserva_id)
    if not reserva:
        raise HTTPException(404, "Reserva no encontrada")
    if reserva.estado in [models.EstadoReserva.cancelada, models.EstadoReserva.completada]:
        raise HTTPException(400, "No se pueden reprogramar reservas finalizadas")

    _validar_solapamiento(
        db, reserva.espacio_id, datos.fecha, datos.hora_inicio, datos.hora_fin,
        excluir_reserva_id=reserva.id,
    )
    horario_anterior = f"{reserva.estado.value} | {reserva.fecha} {reserva.hora_inicio}-{reserva.hora_fin}"
    reserva.fecha = datos.fecha
    reserva.hora_inicio = datos.hora_inicio
    reserva.hora_fin = datos.hora_fin
    horario_nuevo = f"{reserva.estado.value} | {reserva.fecha} {reserva.hora_inicio}-{reserva.hora_fin}"
    db.add(models.ReservaHistorial(
        reserva_id=reserva.id,
        estado_anterior=horario_anterior,
        estado_nuevo=horario_nuevo,
    ))
    db.add(models.Notificacion(
        usuario_id=reserva.usuario_id,
        reserva_id=reserva.id,
        mensaje=f"Tu reserva de '{reserva.espacio.nombre}' fue reprogramada para el {datos.fecha}.",
    ))
    db.commit()
    db.refresh(reserva)
    return _cargar_relaciones(db.query(models.Reserva)).filter(models.Reserva.id == reserva.id).first()


@router.get("/{reserva_id}/historial", response_model=list[schemas.ReservaHistorialResponse])
def obtener_historial_reserva(reserva_id: int, db: Session = Depends(get_db)):
    if not db.get(models.Reserva, reserva_id):
        raise HTTPException(404, "Reserva no encontrada")
    return (
        db.query(models.ReservaHistorial)
        .filter(models.ReservaHistorial.reserva_id == reserva_id)
        .order_by(models.ReservaHistorial.fecha_cambio.asc(), models.ReservaHistorial.id.asc())
        .all()
    )


# ------------------------------------------------------------
# Requerimiento 3 — cambio de estado validado contra la máquina de estados
# ------------------------------------------------------------
@router.patch("/{reserva_id}/estado", response_model=schemas.ReservaDetalleOut)
def cambiar_estado_reserva(reserva_id: int, datos: schemas.ReservaCambiarEstado, db: Session = Depends(get_db)):
    reserva = db.get(models.Reserva, reserva_id)
    if not reserva:
        raise HTTPException(404, "Reserva no encontrada")

    if datos.estado not in TRANSICIONES_VALIDAS[reserva.estado]:
        raise HTTPException(
            400,
            f"Transición no válida: {reserva.estado.value} -> {datos.estado.value}",
        )

    # No se puede marcar como 'completada' una reserva sin pago aprobado.
    if datos.estado == models.EstadoReserva.completada:
        if not reserva.pago or reserva.pago.estado != models.EstadoPago.aprobado:
            raise HTTPException(400, "No se puede completar una reserva sin un pago aprobado")

    estado_anterior = reserva.estado.value
    reserva.estado = datos.estado
    db.add(models.ReservaHistorial(
        reserva_id=reserva.id,
        estado_anterior=estado_anterior,
        estado_nuevo=datos.estado.value,
    ))
    db.add(models.Notificacion(
        usuario_id=reserva.usuario_id,
        reserva_id=reserva.id,
        mensaje=f"Tu reserva de {reserva.espacio.nombre} ha cambiado al estado: {datos.estado.value}.",
    ))
    db.commit()
    db.refresh(reserva)


    return _cargar_relaciones(db.query(models.Reserva)).filter(models.Reserva.id == reserva.id).first()
