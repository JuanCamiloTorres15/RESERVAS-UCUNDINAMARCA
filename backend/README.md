# Backend — Plataforma de Reserva de Espacios Deportivos

API REST construida con FastAPI + SQLAlchemy, persistida en PostgreSQL y
containerizada con Docker.

## Ejecución con Docker (recomendado)

Desde la raíz del proyecto (donde está `docker-compose.yml`):

```bash
docker compose up --build
docker compose exec backend python seed.py   # datos de ejemplo (opcional)
```

La API queda disponible en `http://localhost:8000`, con documentación
interactiva en `http://localhost:8000/docs`.

## Ejecución local sin Docker

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload
```

Sin la variable `DATABASE_URL` definida, se usa automáticamente un archivo
SQLite local (`reservas_local.db`) — útil para pruebas rápidas sin Docker.

## Estructura

```
app/
  database.py    # engine, sesión, Base
  models.py      # 6 entidades SQLAlchemy
  schemas.py     # esquemas Pydantic
  main.py        # instancia FastAPI, CORS, routers
  routers/
    usuarios.py
    espacios.py    # Requerimiento 1
    reservas.py    # Requerimientos 2 y 3
    pagos.py       # Requerimiento 4
seed.py
```
