from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/espacios", tags=["espacios"])


@router.get("/", response_model=list[schemas.EspacioOut])
def listar_espacios(db: Session = Depends(get_db)):
    filas = (
        db.query(models.EspacioDeportivo, func.avg(models.Resena.calificacion))
        .outerjoin(models.Resena, models.Resena.espacio_id == models.EspacioDeportivo.id)
        .group_by(models.EspacioDeportivo.id)
        .order_by(models.EspacioDeportivo.nombre)
        .all()
    )
    return [
        {
            **schemas.EspacioOut.model_validate(espacio).model_dump(),
            "calificacion_promedio": round(float(promedio), 2) if promedio is not None else None,
        }
        for espacio, promedio in filas
    ]


@router.post("/", response_model=schemas.EspacioOut, status_code=201)
def crear_espacio(datos: schemas.EspacioCreate, db: Session = Depends(get_db)):
    espacio = models.EspacioDeportivo(**datos.model_dump())
    db.add(espacio)
    db.commit()
    db.refresh(espacio)
    return espacio


@router.get("/{espacio_id}", response_model=schemas.EspacioOut)
def obtener_espacio(espacio_id: int, db: Session = Depends(get_db)):
    espacio = db.get(models.EspacioDeportivo, espacio_id)
    if not espacio:
        raise HTTPException(404, "Espacio no encontrado")
    promedio = (
        db.query(func.avg(models.Resena.calificacion))
        .filter(models.Resena.espacio_id == espacio_id)
        .scalar()
    )
    return {
        **schemas.EspacioOut.model_validate(espacio).model_dump(),
        "calificacion_promedio": round(float(promedio), 2) if promedio is not None else None,
    }


@router.put("/{espacio_id}", response_model=schemas.EspacioOut)
def actualizar_espacio(espacio_id: int, datos: schemas.EspacioUpdate, db: Session = Depends(get_db)):
    espacio = db.get(models.EspacioDeportivo, espacio_id)
    if not espacio:
        raise HTTPException(404, "Espacio no encontrado")
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(espacio, campo, valor)
    db.commit()
    db.refresh(espacio)
    return espacio


@router.delete("/{espacio_id}", status_code=200)
def dar_de_baja_espacio(espacio_id: int, db: Session = Depends(get_db)):
    """Baja lógica: el espacio pasa a 'inactivo' pero no se elimina,
    preservando el historial de reservas asociadas."""
    espacio = db.get(models.EspacioDeportivo, espacio_id)
    if not espacio:
        raise HTTPException(404, "Espacio no encontrado")
    espacio.estado = models.EstadoEspacio.inactivo
    db.commit()
    return {"detail": "Espacio dado de baja (estado -> inactivo)"}
