from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/pagos", tags=["pagos"])


def _horas_reserva(reserva: models.Reserva) -> float:
    inicio = datetime.combine(date.min, reserva.hora_inicio)
    fin = datetime.combine(date.min, reserva.hora_fin)
    return (fin - inicio).total_seconds() / 3600


# ------------------------------------------------------------
# Requerimiento 4 — registrar el pago de una reserva.
#
# Regla de negocio (equivalente al descuento de stock del proyecto
# Helpdesk): el monto pagado debe coincidir con precio_hora * horas de la
# reserva; si no coincide, se rechaza la operación completa (rollback).
# Si el pago se registra como 'aprobado', la reserva pasa automáticamente
# a estado 'confirmada'.
# ------------------------------------------------------------
@router.post("/", response_model=schemas.PagoOut, status_code=201)
def registrar_pago(datos: schemas.PagoCreate, db: Session = Depends(get_db)):
    reserva = db.get(models.Reserva, datos.reserva_id)
    if not reserva:
        raise HTTPException(404, "Reserva no encontrada")
    if reserva.pago:
        raise HTTPException(400, "Esta reserva ya tiene un pago registrado")
    if reserva.estado != models.EstadoReserva.pendiente:
        raise HTTPException(400, "Solo se puede pagar una reserva en estado 'pendiente'")

    monto_esperado = round(reserva.espacio.precio_hora * _horas_reserva(reserva), 2)
    if round(datos.monto, 2) != monto_esperado:
        raise HTTPException(
            400,
            f"El monto no coincide con el valor de la reserva "
            f"(esperado: {monto_esperado}, recibido: {datos.monto}). No se registra el pago.",
        )

    pago = models.Pago(
        reserva_id=datos.reserva_id,
        monto=datos.monto,
        metodo_pago=datos.metodo_pago,
        estado=models.EstadoPago.aprobado,
    )
    db.add(pago)

    # Al aprobarse el pago, la reserva pasa automáticamente a 'confirmada'.
    estado_anterior = reserva.estado.value
    reserva.estado = models.EstadoReserva.confirmada
    db.add(models.ReservaHistorial(
        reserva_id=reserva.id,
        estado_anterior=estado_anterior,
        estado_nuevo=reserva.estado.value,
    ))
    db.add(models.Notificacion(
        usuario_id=reserva.usuario_id,
        reserva_id=reserva.id,
        mensaje=f"Tu pago fue aprobado y tu reserva de {reserva.espacio.nombre} está confirmada.",
    ))

    db.commit()
    db.refresh(pago)


    return pago


@router.get("/{pago_id}", response_model=schemas.PagoOut)
def obtener_pago(pago_id: int, db: Session = Depends(get_db)):
    pago = db.get(models.Pago, pago_id)
    if not pago:
        raise HTTPException(404, "Pago no encontrado")
    return pago
