from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/notificaciones", tags=["notificaciones"])


@router.get("/usuario/{usuario_id}", response_model=list[schemas.NotificacionOut])
def obtener_notificaciones(usuario_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Notificacion)
        .filter(models.Notificacion.usuario_id == usuario_id)
        .order_by(models.Notificacion.id.desc())
        .all()
    )
