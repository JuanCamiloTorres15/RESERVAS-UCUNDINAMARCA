"""Script de datos de ejemplo.
Uso local:   python seed.py
Uso Docker:  docker compose exec backend python seed.py
"""
from datetime import date, time, timedelta

from app.database import SessionLocal, engine
from app import models

models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

if db.query(models.Usuario).count() == 0:
    usuarios = [
        models.Usuario(nombre="Diana Sánchez", email="diana.sanchez@correo.com", rol=models.RolUsuario.cliente),
        models.Usuario(nombre="Camilo Rojas", email="camilo.rojas@correo.com", rol=models.RolUsuario.cliente),
        models.Usuario(nombre="Laura Gómez", email="laura.gomez@ucundinamarca.edu.co", rol=models.RolUsuario.administrador),
    ]
    db.add_all(usuarios)

    espacios = [
        models.EspacioDeportivo(nombre="Cancha de Fútbol 1", tipo=models.TipoEspacio.cancha_futbol, ubicacion="Complejo deportivo, bloque A", capacidad=22, precio_hora=60000),
        models.EspacioDeportivo(nombre="Cancha de Baloncesto Cubierta", tipo=models.TipoEspacio.cancha_baloncesto, ubicacion="Coliseo cubierto", capacidad=10, precio_hora=40000),
        models.EspacioDeportivo(nombre="Piscina Semiolímpica", tipo=models.TipoEspacio.piscina, ubicacion="Complejo acuático", capacidad=30, precio_hora=50000),
        models.EspacioDeportivo(nombre="Cancha de Tenis 1", tipo=models.TipoEspacio.cancha_tenis, ubicacion="Zona de raqueta", capacidad=4, precio_hora=35000),
        models.EspacioDeportivo(nombre="Gimnasio Institucional", tipo=models.TipoEspacio.gimnasio, ubicacion="Bloque de bienestar", capacidad=25, precio_hora=25000),
    ]
    db.add_all(espacios)
    db.commit()

    reserva = models.Reserva(
        espacio_id=espacios[0].id,
        usuario_id=usuarios[0].id,
        fecha=date.today() + timedelta(days=1),
        hora_inicio=time(18, 0),
        hora_fin=time(19, 0),
        estado=models.EstadoReserva.pendiente,
    )
    db.add(reserva)
    db.commit()

    print("Datos de ejemplo insertados: 3 usuarios, 5 espacios, 1 reserva.")
else:
    print("Ya existen datos, no se insertó nada.")

db.close()
