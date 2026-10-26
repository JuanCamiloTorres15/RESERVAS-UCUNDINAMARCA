from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import engine
from .routers import usuarios, espacios, reservas, pagos, reportes, notificaciones, resenas

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Plataforma de Reserva de Espacios Deportivos — API",
    description="Backend del proyecto integrador · Desarrollo Nativo para Dispositivos Móviles · Universidad de Cundinamarca",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(usuarios.router)
app.include_router(espacios.router)
app.include_router(reservas.router)
app.include_router(pagos.router)
app.include_router(reportes.router)
app.include_router(notificaciones.router)
app.include_router(resenas.router)


@app.get("/")
def raiz():
    return {
        "proyecto": "Plataforma de Reserva de Espacios Deportivos",
        "asignatura": "Desarrollo Nativo para Dispositivos Móviles",
        "universidad": "Universidad de Cundinamarca",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
