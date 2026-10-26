from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(tags=["Reseñas"])


@router.post("/api/resenas/", response_model=schemas.ResenaResponse, status_code=201)
def crear_resena(datos: schemas.ResenaCreate, db: Session = Depends(get_db)):
    reserva = db.query(models.Reserva).filter(models.Reserva.id == datos.reserva_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reserva.estado != models.EstadoReserva.completada:
        raise HTTPException(
            status_code=400,
            detail="Solo puedes calificar el espacio una vez la reserva haya sido 'completada'",
        )

    resena_existente = (
        db.query(models.Resena)
        .filter(models.Resena.reserva_id == datos.reserva_id)
        .first()
    )
    if resena_existente:
        raise HTTPException(status_code=400, detail="Ya has calificado esta reserva anteriormente")

    nueva_resena = models.Resena(
        espacio_id=reserva.espacio_id,
        usuario_id=reserva.usuario_id,
        reserva_id=reserva.id,
        calificacion=datos.calificacion,
        comentario=datos.comentario,
    )
    db.add(nueva_resena)
    db.commit()
    db.refresh(nueva_resena)
    return nueva_resena


@router.get("/api/resenas/espacio/{espacio_id}/promedio")
def obtener_promedio_espacio(espacio_id: int, db: Session = Depends(get_db)):
    if not db.get(models.EspacioDeportivo, espacio_id):
        raise HTTPException(status_code=404, detail="Espacio no encontrado")

    promedio = (
        db.query(func.avg(models.Resena.calificacion))
        .filter(models.Resena.espacio_id == espacio_id)
        .scalar()
    )
    total_resenas = (
        db.query(func.count(models.Resena.id))
        .filter(models.Resena.espacio_id == espacio_id)
        .scalar()
    )
    return {
        "espacio_id": espacio_id,
        "promedio": round(float(promedio), 1) if promedio is not None else 0.0,
        "total_resenas": total_resenas or 0,
    }


@router.get("/api/espacios/{espacio_id}/resenas", response_model=schemas.ResenasEspacioOut)
def listar_resenas_espacio(espacio_id: int, db: Session = Depends(get_db)):
    espacio = db.get(models.EspacioDeportivo, espacio_id)
    if not espacio:
        raise HTTPException(status_code=404, detail="Espacio no encontrado")

    promedio = (
        db.query(func.avg(models.Resena.calificacion))
        .filter(models.Resena.espacio_id == espacio_id)
        .scalar()
    )
    resenas = (
        db.query(models.Resena)
        .filter(models.Resena.espacio_id == espacio_id)
        .order_by(models.Resena.fecha_creacion.desc(), models.Resena.id.desc())
        .all()
    )
    return {
        "espacio_id": espacio_id,
        "promedio": round(float(promedio), 2) if promedio is not None else None,
        "total": len(resenas),
        "resenas": resenas,
    }
