from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import EstadoPago, EstadoReserva, EspacioDeportivo, Pago, Reserva
from ..schemas import ReporteResumenResponse

router = APIRouter(prefix="/api/reportes", tags=["Reportes y Estadísticas"])


@router.get("/resumen", response_model=ReporteResumenResponse)
def obtener_resumen_estadisticas(db: Session = Depends(get_db)):
    query_top = (
        db.query(EspacioDeportivo.nombre, func.count(Reserva.id).label("total"))
        .join(Reserva, Reserva.espacio_id == EspacioDeportivo.id)
        .filter(Reserva.estado != EstadoReserva.cancelada)
        .group_by(EspacioDeportivo.id, EspacioDeportivo.nombre)
        .order_by(func.count(Reserva.id).desc(), EspacioDeportivo.nombre)
        .first()
    )
    espacio_top = query_top[0] if query_top else "Ninguno registrado"

    ingresos_query = (
        db.query(func.sum(Pago.monto))
        .filter(Pago.estado == EstadoPago.aprobado)
        .scalar()
    )
    ingresos_totales = float(ingresos_query) if ingresos_query is not None else 0.0

    conteos_tipo = (
        db.query(EspacioDeportivo.tipo, func.count(Reserva.id))
        .join(Reserva, Reserva.espacio_id == EspacioDeportivo.id)
        .filter(Reserva.estado.in_([EstadoReserva.confirmada, EstadoReserva.completada]))
        .group_by(EspacioDeportivo.tipo)
        .all()
    )
    total_reservas_activas = sum(cantidad for _, cantidad in conteos_tipo) or 1
    ocupacion_dict = {
        tipo.value: round((cantidad / total_reservas_activas) * 100, 1)
        for tipo, cantidad in conteos_tipo
    }
    if not ocupacion_dict:
        ocupacion_dict = {"Canchas": 0.0, "Piscina": 0.0, "Gimnasio": 0.0}

    return ReporteResumenResponse(
        espacio_mas_reservado=espacio_top,
        ingresos_totales=ingresos_totales,
        ocupacion_por_tipo=ocupacion_dict,
    )
