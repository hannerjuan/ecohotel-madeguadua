# EcoHotel Madeguadua

Sitio web y sistema de reservas del EcoHotel Madeguadua (Norcasia, Caldas): página de inicio, cabañas con calendario de disponibilidad y reserva por WhatsApp, actividades, reseñas y un panel de administración.

## Arquitectura

```
navegador (React + Vite)  ──/api──▶  backend (Express + TypeScript)  ──Admin SDK──▶  Firebase (Firestore + Storage)
        │                                       ▲
        └── inicio de sesión con Google (Firebase Auth) ── token ──┘
```

- **`src/`**: frontend en React 19, Tailwind 4 y React Router. No lee ni escribe Firestore directamente; todo pasa por `src/lib/api.ts`.
- **`server/`**: API REST propia. Valida los datos (zod), calcula precios, evita reservas que se crucen y decide quién es administrador.
- **`shared/types.ts`**: tipos usados por ambos lados.
- **Firestore** sigue siendo la base de datos, así que los datos existentes se conservan. Las reglas (`firestore.rules`) bloquean el acceso directo desde el navegador.

## Cómo correrlo

Requiere Node 20 o superior.

```bash
npm install
npm run dev
```

Abre http://localhost:3000. `npm run dev` levanta la web (puerto 3000) y la API (puerto 8080) a la vez.

Sin credenciales, la API arranca en **modo memoria** con cabañas y actividades de ejemplo, que se pierden al reiniciar. Para trabajar con la base real, copia `.env.example` como `.env` y define `DATA_BACKEND=firestore` junto con las credenciales de una cuenta de servicio de Firebase.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Web y API en modo desarrollo |
| `npm test` | Pruebas de la API (Vitest + Supertest) |
| `npm run lint` | Chequeo de tipos del frontend y del backend |
| `npm run build` | Compila la web en `dist/` y la API en `dist-server/` |
| `npm start` | Producción: un solo servidor entrega la web y la API |

## Producción

1. `npm run build` y luego `npm start` (por defecto en el puerto `PORT` o 8080). En Cloud Run las credenciales de Firebase se toman del servicio; en otro hosting usa `FIREBASE_SERVICE_ACCOUNT`.
2. Publica las reglas de seguridad nuevas: `firebase deploy --only firestore:rules,storage` (o pégalas en la consola de Firebase). **Hazlo después de desplegar el backend**, porque la versión anterior de la web escribía directo en Firestore y dejaría de funcionar.
3. Entra a `/admin` con la cuenta de Google del hotel y revisa la pestaña **Ajustes**: número de WhatsApp, fotos de portada y textos de políticas.

Variables de entorno: ver `.env.example`.

## API

Todas las rutas empiezan por `/api`. Las de `/api/admin` exigen el header `Authorization: Bearer <ID token de Firebase>` de un administrador (correo en `ADMIN_EMAILS` o `role: "admin"` en `users/{uid}`).

### Públicas

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Estado del servidor |
| GET | `/settings` | Datos del hotel: WhatsApp, dirección, mapa, portada, políticas |
| GET | `/me` | Usuario de la sesión y si es administrador |
| GET | `/cabins` | Lista de cabañas |
| GET | `/cabins/:id` | Detalle de una cabaña |
| GET | `/cabins/:id/availability` | Rangos ocupados (solo fechas, sin datos de huéspedes) |
| GET | `/cabins/:id/quote?checkIn&checkOut` | Noches, total y disponibilidad |
| GET | `/cabins/:id/reviews` | Reseñas publicadas y promedio |
| POST | `/cabins/:id/reviews` | Publicar una reseña |
| GET | `/reviews/featured` | Mejores reseñas recientes (inicio) |
| GET | `/activities` | Lista de actividades |
| GET | `/activities/:id` | Detalle de una actividad |
| POST | `/reservations` | Solicitar reserva; devuelve el código y el enlace de WhatsApp |

### Administración (`/api/admin`)

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/stats` | Pendientes, ocupación de 30 días, ingresos del mes, próximas llegadas |
| POST · PUT · DELETE | `/cabins`, `/cabins/:id` | Gestionar cabañas |
| POST · PUT · DELETE | `/activities`, `/activities/:id` | Gestionar actividades |
| GET | `/reservations?status&cabinId&from&to` | Reservas con filtros |
| GET | `/reservations.csv` | Exportar a CSV (Excel) |
| GET · DELETE | `/reservations/:id` | Ver o eliminar una reserva |
| PATCH | `/reservations/:id/status` | Confirmar, cancelar o volver a pendiente |
| GET | `/reviews` | Todas las reseñas, incluidas las ocultas |
| PATCH · DELETE | `/reviews/:id` | Ocultar, publicar o eliminar una reseña |
| PUT | `/settings` | Guardar ajustes del hotel |
| POST | `/uploads` | Subir imágenes (campo `files`, hasta 10) |

### Reglas de reservas

- Una solicitud nueva queda **pendiente** y no bloquea fechas; así nadie puede apartar el calendario con solicitudes falsas.
- Las fechas se bloquean al **confirmar**. El servidor no deja confirmar dos reservas que se crucen ni crear una solicitud sobre fechas ya confirmadas (operación atómica en Firestore).
- El día de salida queda libre para la siguiente llegada.
- Estadía máxima en línea: 30 noches, hasta 18 meses adelante. El total lo calcula el servidor.
- Los formularios públicos tienen límite de solicitudes por IP y un campo trampa contra bots.
