from datetime import datetime, date, time
from typing import Dict, Optional
from pydantic import BaseModel, ConfigDict, Field

from .models import (
    RolUsuario, TipoEspacio, EstadoEspacio, EstadoReserva, MetodoPago, EstadoPago
)


# ============================================================
# Usuario
# ============================================================
class UsuarioBase(BaseModel):
    nombre: str
    email: str
    rol: RolUsuario = RolUsuario.cliente


class UsuarioCreate(UsuarioBase):
    pass


class UsuarioOut(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool
    fecha_registro: datetime


# ============================================================
# EspacioDeportivo — Requerimiento 1
# ============================================================
class EspacioBase(BaseModel):
    nombre: str
    tipo: TipoEspacio
    ubicacion: Optional[str] = None
    capacidad: int = 1
    precio_hora: float


class EspacioCreate(EspacioBase):
    pass


class EspacioUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[TipoEspacio] = None
    ubicacion: Optional[str] = None
    capacidad: Optional[int] = None
    precio_hora: Optional[float] = None
    estado: Optional[EstadoEspacio] = None


class EspacioOut(EspacioBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    estado: EstadoEspacio
    calificacion_promedio: Optional[float] = None


# ============================================================
# Reserva — Requerimientos 2 y 3
# ============================================================
class ReservaBase(BaseModel):
    espacio_id: int
    usuario_id: int
    fecha: date
    hora_inicio: time
    hora_fin: time


class ReservaCreate(ReservaBase):
    pass


class ReservaCambiarEstado(BaseModel):
    estado: EstadoReserva


class ReprogramarReservaInput(BaseModel):
    fecha: date
    hora_inicio: time
    hora_fin: time


class ReservaHistorialResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reserva_id: int
    estado_anterior: str
    estado_nuevo: str
    fecha_cambio: datetime


# Alias conservados para compatibilidad con los routers actuales.
ReservaReprogramar = ReprogramarReservaInput
ReservaHistorialOut = ReservaHistorialResponse


class ReservaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fecha: date
    hora_inicio: time
    hora_fin: time
    estado: EstadoReserva
    fecha_creacion: datetime
    espacio_id: int
    usuario_id: int


# ============================================================
# Pago — Requerimiento 4
# ============================================================
class PagoCreate(BaseModel):
    reserva_id: int
    metodo_pago: MetodoPago
    monto: float


class PagoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reserva_id: int
    monto: float
    metodo_pago: MetodoPago
    estado: EstadoPago
    fecha_pago: datetime


class ReservaDetalleOut(ReservaOut):
    espacio: EspacioOut
    usuario: UsuarioOut
    pago: Optional[PagoOut] = None


# ============================================================
# Reportes
# ============================================================
class ReporteResumenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    espacio_mas_reservado: str
    ingresos_totales: float
    ocupacion_por_tipo: Dict[str, float]


ReporteResumen = ReporteResumenResponse


class NotificacionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    usuario_id: int
    reserva_id: Optional[int] = None
    mensaje: str
    leida: bool
    fecha: datetime


class ResenaCreate(BaseModel):
    reserva_id: int
    calificacion: int = Field(..., ge=1, le=5, description="Calificación de 1 a 5 estrellas")
    comentario: Optional[str] = None


class ResenaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reserva_id: int
    usuario_id: int
    espacio_id: int
    calificacion: int
    comentario: Optional[str] = None
    fecha: datetime


class ResenaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    espacio_id: int
    usuario_id: int
    reserva_id: int
    calificacion: int
    comentario: Optional[str]
    fecha_creacion: datetime


class ResenasEspacioOut(BaseModel):
    espacio_id: int
    promedio: Optional[float] = None
    total: int
    resenas: list[ResenaOut]
