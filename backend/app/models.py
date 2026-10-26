import enum
from datetime import datetime, date, time

from sqlalchemy import (
    CheckConstraint, Column, Integer, String, Float, Boolean, DateTime, Date, Time,
    ForeignKey, Enum
)
from sqlalchemy.orm import relationship, synonym

from .database import Base

class RolUsuario(str, enum.Enum):
    cliente = "cliente"
    administrador = "administrador"


class TipoEspacio(str, enum.Enum):
    cancha_futbol = "cancha_futbol"
    cancha_baloncesto = "cancha_baloncesto"
    cancha_tenis = "cancha_tenis"
    piscina = "piscina"
    gimnasio = "gimnasio"


class EstadoEspacio(str, enum.Enum):
    disponible = "disponible"
    mantenimiento = "mantenimiento"
    inactivo = "inactivo"


class EstadoReserva(str, enum.Enum):
    pendiente = "pendiente"
    confirmada = "confirmada"
    cancelada = "cancelada"
    completada = "completada"


class MetodoPago(str, enum.Enum):
    tarjeta = "tarjeta"
    transferencia = "transferencia"
    efectivo = "efectivo"


class EstadoPago(str, enum.Enum):
    pendiente = "pendiente"
    aprobado = "aprobado"
    rechazado = "rechazado"

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(120), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    rol = Column(Enum(RolUsuario), default=RolUsuario.cliente, nullable=False)
    activo = Column(Boolean, default=True)
    fecha_registro = Column(DateTime, default=datetime.utcnow)

    reservas = relationship("Reserva", back_populates="usuario")
    resenas = relationship("Resena", back_populates="usuario")
    notificaciones = relationship("Notificacion", back_populates="usuario")

class EspacioDeportivo(Base):
    __tablename__ = "espacios_deportivos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(120), nullable=False)
    tipo = Column(Enum(TipoEspacio), nullable=False)
    ubicacion = Column(String(150))
    capacidad = Column(Integer, default=1)
    precio_hora = Column(Float, nullable=False)
    estado = Column(Enum(EstadoEspacio), default=EstadoEspacio.disponible)

    reservas = relationship("Reserva", back_populates="espacio")
    resenas = relationship("Resena", back_populates="espacio")

class Reserva(Base):
    __tablename__ = "reservas"

    id = Column(Integer, primary_key=True, index=True)
    espacio_id = Column(Integer, ForeignKey("espacios_deportivos.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    estado = Column(Enum(EstadoReserva), default=EstadoReserva.pendiente, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)

    espacio = relationship("EspacioDeportivo", back_populates="reservas")
    usuario = relationship("Usuario", back_populates="reservas")
    pago = relationship("Pago", back_populates="reserva", uselist=False)
    resena = relationship("Resena", back_populates="reserva", uselist=False)

class Pago(Base):
    __tablename__ = "pagos"

    id = Column(Integer, primary_key=True, index=True)
    reserva_id = Column(Integer, ForeignKey("reservas.id"), unique=True, nullable=False)
    monto = Column(Float, nullable=False)
    metodo_pago = Column(Enum(MetodoPago), nullable=False)
    estado = Column(Enum(EstadoPago), default=EstadoPago.pendiente)
    fecha_pago = Column(DateTime, default=datetime.utcnow)

    reserva = relationship("Reserva", back_populates="pago")

class Resena(Base):
    __tablename__ = "resenas"

    id = Column(Integer, primary_key=True, index=True)
    espacio_id = Column(Integer, ForeignKey("espacios_deportivos.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    reserva_id = Column(Integer, ForeignKey("reservas.id", ondelete="CASCADE"), nullable=False, unique=True)
    calificacion = Column(Integer, nullable=False)  # 1 a 5
    comentario = Column(String, nullable=True)
    # Keep the existing physical column name for compatibility with databases already created.
    fecha_creacion = Column("fecha", DateTime, default=datetime.utcnow)
    fecha = synonym("fecha_creacion")

    __table_args__ = (
        CheckConstraint("calificacion >= 1 AND calificacion <= 5", name="check_calificacion_rango"),
    )

    reserva = relationship("Reserva", back_populates="resena")
    usuario = relationship("Usuario", back_populates="resenas")
    espacio = relationship("EspacioDeportivo", back_populates="resenas")

class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    reserva_id = Column(Integer, ForeignKey("reservas.id"), nullable=True)
    mensaje = Column(String(250), nullable=False)
    leida = Column(Boolean, default=False)
    fecha = Column(DateTime, default=datetime.utcnow)

    usuario = relationship("Usuario", back_populates="notificaciones")


class ReservaHistorial(Base):
    __tablename__ = "reserva_historial"

    id = Column(Integer, primary_key=True, index=True)
    reserva_id = Column(Integer, ForeignKey("reservas.id", ondelete="CASCADE"), nullable=False)
    estado_anterior = Column(String, nullable=False)
    estado_nuevo = Column(String, nullable=False)
    fecha_cambio = Column(DateTime, default=datetime.utcnow, nullable=False)

