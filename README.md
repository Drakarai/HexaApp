# HexaApp

Aplicación para gestionar competiciones tipo **Hexalocke**: un nuzlocke por
puntos entre varios jugadores, con reglas propias, level caps, jornadas y
clasificación.

Cada edición (Hexalocke 1, 2, 3…) es una **competición independiente**. Al crear
una nueva, la anterior se archiva con todos sus datos intactos: reglas, muertes,
puntos, jornadas y ruletas quedan guardados como recuerdo y se pueden consultar
en cualquier momento desde el selector de la barra lateral.

## Qué incluye

| Sección | Qué hace |
| --- | --- |
| **Resumen** | Level cap actual, clasificación, próxima jornada, últimas bajas y últimos giros de ruleta. |
| **Reglas** | Normativa del locke por secciones y categorías. Editable por administradores, con orden configurable. |
| **Level caps** | Nivel máximo de cada gimnasio / Alto Mando / Liga. Cada jugador marca cuándo lo supera, así se ve quién frena al grupo. |
| **Cementerio** | Caja estilo PC de Pokémon: una casilla con sprite por cada caído. Al pinchar se abre su ficha, con una imagen grande independiente del sprite. Filtrable por jugador. |
| **Jornadas** | Emparejamientos por jornada, ganador y diferencia de pokémon. Marcar el ganador **suma automáticamente** el punto de la victoria. |
| **Puntos** | Clasificación con desempates, ajuste rápido ±1, ajustes con motivo, ajuste masivo a todos e historial completo de movimientos. |
| **Ruleta** | Ruletas totalmente personalizables: opciones, pesos, colores, duración del giro y modo sin repetición. El sorteo se decide en el servidor. |
| **Mis notas** | Cuaderno **privado** con un sub-apartado por jugador (incluido uno mismo) más notas generales. Nadie más las ve, tampoco los administradores. |
| **Competiciones** | Crear ediciones nuevas copiando reglas/level caps/jugadores/ruletas, archivar, reactivar y gestionar participantes. |
| **Administración** | Alta de usuarios, roles y contraseñas. |

### Imágenes

En el cementerio y en el perfil puedes **subir una imagen del ordenador** o
**pegar el enlace** de una imagen de internet. Las que subes se reducen de
tamaño en el navegador y se guardan dentro de la propia base de datos, así que
el fichero `.db` se lleva todo consigo: copiarlo es copiar la aplicación entera
con sus fotos.

Cada baja tiene dos imágenes distintas y opcionales: el **sprite de la caja**
(el cuadradito de la cuadrícula, se elige al registrarla) y la **imagen de la
ficha** (la grande que se ve al pincharla). Si falta la de la ficha, se usa el
sprite; si falta el sprite, sale una pokéball de relleno.

La foto de perfil aparece en la clasificación, el cementerio, las jornadas y la
cabecera. Si no pones ninguna, se usa la inicial sobre tu color.

### Clasificación y desempates

El orden sigue las reglas del locke: **puntos** → **menos pokémon muertos** →
**mejor diferencia de pokémon** en los combates de jornada. Los dos primeros
aparecen marcados como clasificados directos para la Final Four.

## Puesta en marcha

```bash
npm install
cp .env.example .env      # y cambia AUTH_SECRET
npm run setup             # crea la base de datos y carga los datos de ejemplo
npm run dev               # http://localhost:3000
```

El seed crea la competición de ejemplo *Hexalocke 2* (reglas, 10 level caps,
5 jornadas con sus parejas y 2 ruletas) más siete cuentas: `admin`, `draka`,
`pablo`, `hector`, `rodri`, `enzo` y `alex`. La contraseña de todas es la de
`SEED_PASSWORD` (por defecto `hexalocke`).

> Cambia las contraseñas desde **Administración** antes de usarlo en serio, y
> pon un `AUTH_SECRET` largo y aleatorio:
> `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Para arrancar de cero sin datos de ejemplo, ejecuta `npm run db:push` en lugar de
`npm run setup` y crea el primer usuario administrador a mano:

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
await prisma.user.create({ data: {
  username: 'admin', displayName: 'Admin', role: 'ADMIN',
  passwordHash: await bcrypt.hash('CAMBIAME', 10),
}});
"
```

### Actualizar a una versión nueva

Los datos viven en `prisma/dev.db`, que **no** se sobrescribe al actualizar el
código. Con Git:

```bash
git pull
npm install
npm run db:push   # aplica los cambios del modelo de datos, sin borrar nada
npm run dev
```

Si bajaste el proyecto como ZIP en vez de con Git: descomprime la versión nueva
en otra carpeta, copia tu `prisma/dev.db` de la carpeta vieja a la nueva y
ejecuta ahí los mismos comandos (`npm install`, `npm run db:push`, `npm run dev`).

### Producción

```bash
npm run build
npm start
```

La base de datos es un fichero SQLite (`prisma/dev.db` por defecto). Para
desplegar, monta ese fichero en un volumen persistente y define `DATABASE_URL` y
`AUTH_SECRET` en el entorno.

## Roles

- **Administrador global**: crea competiciones y usuarios, y puede gestionar
  cualquier competición.
- **Administrador de competición**: un participante marcado como admin dentro de
  una edición concreta. Puede editar reglas, level caps, jornadas, puntos y
  ruletas de *esa* competición.
- **Jugador**: registra sus propias muertes, marca sus gimnasios superados y
  escribe sus notas privadas.

## Stack

Next.js 16 (App Router y Server Actions) · React 19 · TypeScript · Tailwind CSS 4 ·
Prisma 6 sobre SQLite · sesiones propias con cookie firmada (JWT) y bcrypt.

```
src/
  app/
    (app)/          páginas con sesión iniciada (una carpeta por sección)
    actions/        server actions, agrupadas por dominio
    login/          pantalla de acceso
  components/       UI compartida (ruleta, clasificación, formularios base)
  lib/              db, auth, sesión, permisos y cálculo de la clasificación
prisma/
  schema.prisma     modelo de datos
  seed.ts           datos de ejemplo del Hexalocke 2
```

## Ideas para más adelante

Cosas que encajan con el modelo de datos actual y quedan pendientes:

- **Equipos**: fichar los 6 pokémon vivos de cada jugador, no solo los muertos.
- **Encuentros por ruta**: registrar qué salió en cada zona y si se capturó.
- **Final Four**: bracket del torneo con los 4 clasificados.
- **Apuestas entre jornadas**: proponer una apuesta y votarla, como en las reglas.
- **Subida de vídeos** o enlaces a las grabaciones de cada combate de gimnasio.
- **Notificaciones** cuando todos superan un gimnasio y se desbloquea seguir.
- **Exportar** una edición archivada a PDF o imagen como resumen final.
