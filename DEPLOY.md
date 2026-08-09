# Poner HexaApp en internet (gratis)

Al terminar esta guía tendrás una dirección tipo `https://hexaapp.vercel.app`
que funciona en el PC y que tus seis jugadores pueden **instalar en el móvil**
como una app más.

Usamos dos servicios, los dos con plan gratuito suficiente de sobra para esto:

- **Neon** guarda los datos (PostgreSQL). Plan gratis: 0,5 GB.
- **Vercel** ejecuta la aplicación. Plan Hobby: gratis para proyectos personales.

No hace falta tarjeta en ninguno de los dos. Cuenta unos 20 minutos la primera vez.

---

## 1. Subir el código a tu GitHub

Si aún no lo tienes ahí, crea un repositorio y sube el proyecto. Vercel lee el
código desde GitHub, y así cada cambio que subas se publica solo.

## 2. Crear la base de datos en Neon

1. Entra en [neon.tech](https://neon.tech) y regístrate con GitHub.
2. **Create project**. Nombre: `hexaapp`. Región: la más cercana (Frankfurt si
   estás en España).
3. Al terminar te enseña una **connection string**. Copia la que pone
   **Pooled connection**, es la que aguanta muchas visitas a la vez. Tiene esta
   pinta:

   ```
   postgresql://usuario:contraseña@ep-algo-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

   Guárdala, la vas a usar dos veces.

## 3. Preparar la base de datos desde tu ordenador

En la carpeta del proyecto, edita el fichero `.env` y pon la cadena de Neon:

```
DATABASE_URL="postgresql://...la-que-copiaste..."
AUTH_SECRET="una-clave-larga-y-aleatoria"
```

Para generar la clave de sesión:

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Y ahora crea las tablas:

```
npm run db:push
```

Después, **una de estas dos**:

- **Empezar de cero** con la competición de ejemplo y los siete usuarios:

  ```
  npm run db:seed
  ```

- **Llevarte los datos que ya tenías** en tu ordenador (la versión con SQLite).
  Desde la carpeta antigua exporta, y desde la nueva importa:

  ```
  npx tsx scripts/export-sqlite.ts            (en la carpeta vieja)
  npx tsx scripts/import-json.ts              (en la nueva, con el .env de Neon)
  ```

  El fichero `hexaapp-export.json` que genera el primer comando es el que lee el
  segundo, cópialo entre carpetas. Repetir la importación no duplica nada.

Comprueba que ha ido bien:

```
npm run users
```

Debería listarte los usuarios que hay en Neon.

## 4. Publicar en Vercel

1. Entra en [vercel.com](https://vercel.com) y regístrate con GitHub.
2. **Add New → Project** y elige el repositorio `HexaApp`.
3. Vercel detecta Next.js solo. **No cambies** los ajustes de compilación.
4. Antes de darle a Deploy, abre **Environment Variables** y añade dos:

   | Nombre | Valor |
   | --- | --- |
   | `DATABASE_URL` | la cadena *pooled* de Neon |
   | `AUTH_SECRET` | la misma clave larga del paso 3 |

5. **Deploy**. Un par de minutos y te da la dirección.

Entra, prueba a iniciar sesión y **cambia todas las contraseñas** desde
*Administración*: hasta que lo hagas, cualquiera que conozca la contraseña del
seed puede entrar.

A partir de aquí, cada vez que subas cambios a GitHub, Vercel republica solo.
Si algún cambio toca el modelo de datos, ejecuta `npm run db:push` desde tu
ordenador (con el `.env` apuntando a Neon) para aplicarlo también allí.

---

## 5. Instalarla en el móvil

Pásales el enlace a los seis. En cada teléfono:

**Android (Chrome)**
Abre el enlace → menú de los tres puntos → **Instalar aplicación** (o *Añadir a
pantalla de inicio*).

**iPhone (Safari)**
Abre el enlace → botón de compartir → **Añadir a pantalla de inicio**. En iPhone
tiene que ser con Safari; desde Chrome no aparece la opción.

Queda con su icono entre las demás apps y se abre a pantalla completa, sin barra
de navegador. Por dentro es la misma web, así que todo el mundo ve los mismos
datos al instante y no hay que actualizar nada a mano.

---

## Preguntas que te van a surgir

**¿Esto va a costar dinero en algún momento?**
Con seis jugadores, no. El plan gratis de Vercel es para proyectos sin ánimo de
lucro y el de Neon da 0,5 GB, que a base de sprites de 1 KB no se llena. Si un
día Neon avisa de que el proyecto lleva días inactivo, se despierta solo al
entrar (la primera carga tarda un par de segundos más).

**¿Puedo seguir tocando el código en mi ordenador?**
Sí. `npm run dev` sigue funcionando; usará la misma base de datos de Neon, así
que ojo: lo que borres en local lo borras para todos. Si prefieres un entorno de
pruebas aparte, en Neon puedes crear una *branch* de la base de datos gratis y
poner esa cadena en tu `.env` local.

**¿Y si quiero que esté en Google Play?**
Eso ya cuesta dinero (25 € de alta única en Google, 99 €/año en Apple) y hay que
empaquetar la app aparte. La instalación desde el navegador que acabas de hacer
da la misma experiencia para vuestro caso.

**Se me ha olvidado la contraseña y no puedo entrar.**
Desde tu ordenador, con el `.env` apuntando a Neon:

```
npm run users                          ver qué usuarios hay
npx tsx scripts/users.ts admin nuevaclave
```
