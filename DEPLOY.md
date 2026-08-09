# Poner HexaApp en internet, paso a paso

Esta guía da por hecho que no has desplegado nada en tu vida. **No hace falta
usar la terminal en ningún momento**: todo se hace desde el navegador.

Al terminar tendrás una dirección tipo `https://hexaapp.vercel.app` que funciona
en el PC y que los seis podéis instalar en el móvil como una app.

Tiempo: unos 20 minutos. Coste: 0 €, y sin meter tarjeta en ningún sitio.

---

## Antes de empezar: qué es cada cosa

Tu aplicación necesita dos cosas para vivir en internet:

**Un sitio donde guardar los datos** (usuarios, muertes, puntos, notas…). Eso es
la *base de datos*. Vamos a usar **Neon**, que regala una.

**Un sitio donde ejecutar el código** que enseña las páginas. Eso es el
*hosting*. Vamos a usar **Vercel**, que es de los mismos que hicieron Next.js,
la tecnología con la que está hecha HexaApp, y también tiene plan gratis.

Los dos se conectan a tu repositorio de GitHub, donde ya está el código subido.
Tú no tienes que subir nada: **ya está ahí**, en
`github.com/PepeLePew016/HexaApp`.

El orden importa: primero Neon (porque Vercel necesita saber dónde está la base
de datos), después Vercel.

---

## Parte 1 — Crear la base de datos en Neon

### 1.1 Crear la cuenta

Entra en **[neon.com](https://neon.com)** y pulsa el botón de registro
(*Sign up*). Elige **Continue with GitHub**: así usas la cuenta de GitHub que ya
tienes y te ahorras otra contraseña. GitHub te preguntará si autorizas a Neon;
dile que sí.

No te va a pedir tarjeta. Si en algún momento te ofrece un plan de pago,
ignóralo y quédate en el gratuito (*Free*).

### 1.2 Crear el proyecto

Nada más entrar te propone crear un proyecto. Rellena:

- **Project name**: `hexaapp` (o lo que quieras, da igual)
- **Postgres version**: la que venga por defecto
- **Region**: la más cercana a vosotros. Si estáis en España, elige una de
  Europa (Frankfurt o Ireland). Esto solo afecta a que la app vaya un pelín más
  rápida.

Pulsa **Create project**.

### 1.3 Copiar la cadena de conexión

Esto es lo único importante de Neon. La *cadena de conexión* es la dirección de
tu base de datos con su usuario y contraseña dentro, todo en una línea. Tiene
esta pinta:

```
postgresql://neondb_owner:npg_AbC123xyz@ep-cool-name-12345-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Nada más crear el proyecto, Neon te la enseña en un recuadro con un botón de
copiar. Si te aparecen varias opciones, fíjate en dos cosas:

- Que sea la **pooled** (suele venir marcada por defecto, y se reconoce porque
  lleva `-pooler` en medio). Es la que aguanta que entren varios a la vez.
- Que el desplegable esté en **Prisma** o en **Parameters / psql** dando la URL
  entera. Lo que necesitas es la línea completa que empieza por `postgresql://`.

**Cópiala y pégala en algún sitio** donde no la pierdas: notas del móvil, un
archivo de texto, lo que sea. La vas a necesitar dentro de un rato.

> Trátala como una contraseña, porque lleva una dentro. No la pegues en un chat
> ni la subas a GitHub.

Si cierras la ventana y no sabes dónde estaba: en el panel de tu proyecto hay un
botón **Connect** (o *Connection details*) que te la vuelve a enseñar.

Ya está. Neon terminado, no hay que tocar nada más ahí.

---

## Parte 2 — Publicar la aplicación en Vercel

### 2.1 Crear la cuenta

Entra en **[vercel.com](https://vercel.com)** → *Sign Up* → **Continue with
GitHub**. Autoriza igual que antes.

Cuando pregunte para qué es, elige el plan **Hobby**, que es el gratuito. Si te
pide un nombre de equipo, pon el que quieras.

### 2.2 Importar tu repositorio

En el panel, botón **Add New… → Project**.

Te sale la lista de tus repositorios de GitHub. Busca **HexaApp** y pulsa
**Import**.

Si no aparece en la lista, pulsa *Adjust GitHub App Permissions* (o
*Configure GitHub App*) y dale permiso a Vercel para ver ese repositorio. Es un
paso normal de GitHub, no es que hayas hecho nada mal.

### 2.3 Las variables de entorno (el paso clave)

Ahora ves una pantalla de configuración con el nombre del proyecto y unos
desplegables. **No toques nada de *Build and Output Settings***: Vercel reconoce
Next.js solo y ya está bien configurado.

Lo que sí tienes que hacer es abrir la sección **Environment Variables**. Son
datos secretos que la aplicación necesita y que no van dentro del código. Hay
que añadir dos, con estos nombres exactos:

**Primera:**

- Name: `DATABASE_URL`
- Value: la cadena de Neon que copiaste en el paso 1.3

**Segunda:**

- Name: `AUTH_SECRET`
- Value: una tira larga de caracteres al azar

Esa segunda es la llave con la que la aplicación firma las sesiones: es lo que
hace que nadie pueda falsificar que ha iniciado sesión como tú. Vale cualquier
cosa larga y aleatoria, no tienes que recordarla nunca. Aporrea el teclado unos
50 caracteres o usa un generador de contraseñas. Por ejemplo, algo de esta
longitud:

```
7f3aK9pQ2xR8mB4vN6wZ1yT5cJ0hL7dG3sE9uF2iO8rX4nA6kM1bV5
```

Escribe la tuya, no copies esa.

### 2.4 Desplegar

Pulsa **Deploy** y espera. Verás pasar un montón de texto: es el ordenador de
Vercel instalando y compilando la aplicación. Tarda entre uno y tres minutos.

Durante ese proceso pasa algo que te viene muy bien: la aplicación **crea sola
todas las tablas** en tu base de datos de Neon. No tienes que preparar nada.

Cuando termine te sale una pantalla de enhorabuena con una captura de tu app y
la dirección, algo como `hexaapp-xxxx.vercel.app`. Pulsa **Continue to
Dashboard** y arriba tendrás el enlace (*Visit* o *Domains*).

---

## Parte 3 — Primer arranque: crear tu cuenta

Abre tu dirección en el navegador. Como la base de datos está vacía, la
aplicación te lleva directamente a una pantalla de bienvenida que te pide:

- **Tu nombre**: como quieres que te vean los demás (`Ash`, `Draka`…)
- **Usuario para entrar**: en minúsculas y sin espacios (`ash`)
- **Contraseña**: la que tú quieras, mínimo 6 caracteres
- Una casilla marcada para **cargar la competición de ejemplo**, que crea el
  Hexalocke 2 con sus reglas, sus 10 level caps y dos ruletas. Déjala marcada si
  te viene bien tenerlo ya escrito; todo se puede editar y borrar después.

Le das a **Crear mi cuenta y empezar** y ya estás dentro, como administrador.

Esa pantalla **solo aparece una vez**: en cuanto existe una cuenta, desaparece
para siempre y la aplicación pide iniciar sesión con normalidad. Aun así, haz
este primer paso cuanto antes: mientras no exista ninguna cuenta, cualquiera que
diera con tu dirección podría crearla.

### Dar de alta a los otros cinco

Dentro de la app, menú **Administración → Crear usuario**. Para cada uno pon su
usuario, su nombre y una contraseña inicial que les pasas por privado (que ellos
la cambien luego desde *Mi perfil*).

Después ve a **Competiciones** y añádelos como jugadores de la competición.

---

## Parte 4 — Instalarla en el móvil

Pásales el enlace por el grupo. En cada teléfono:

**Android, con Chrome**
Abre el enlace → menú de los tres puntos arriba a la derecha → **Añadir a
pantalla de inicio** o **Instalar aplicación** → *Instalar*.

**iPhone, con Safari** (tiene que ser Safari, desde Chrome no sale la opción)
Abre el enlace → botón de compartir, el cuadrado con la flecha hacia arriba →
baja en el menú y pulsa **Añadir a pantalla de inicio** → *Añadir*.

Queda con su icono junto al resto de apps y se abre a pantalla completa, sin
barra de navegador. Por dentro sigue siendo la misma web, así que todos veis los
mismos datos al momento y nadie tiene que actualizar nada nunca.

---

## Y a partir de ahora

**Para cambiar algo de la aplicación**: cada vez que se suba un cambio al
repositorio de GitHub, Vercel lo publica solo en un par de minutos. No hay que
volver a tocar nada de lo anterior.

**Los datos no se pierden** al publicar cambios: viven en Neon, que es otro
sitio distinto.

---

## Si algo sale mal

**El despliegue falla en Vercel (sale en rojo).**
Entra en el despliegue y busca el texto en rojo del final. Los dos motivos
habituales son que `DATABASE_URL` esté mal copiada (le falta un trozo, o sobra
un espacio al principio o al final) o que no hayas añadido `AUTH_SECRET`.
Corriges la variable en *Settings → Environment Variables* y pulsas
**Redeploy**. Ojo: cambiar una variable no republica sola, hay que darle a
redesplegar.

**La página carga pero da error 500.**
Casi siempre es la base de datos: la cadena de Neon es incorrecta o el proyecto
de Neon se ha borrado. Compruébala en *Settings → Environment Variables*.

**La primera visita del día tarda unos segundos.**
Normal. En el plan gratis, Neon duerme la base de datos cuando lleva un rato sin
usarse y tarda un poco en despertar. A partir de la segunda carga va rápido.

**Me he quedado fuera y no puedo entrar.**
Que entre otro administrador y te cambie la contraseña desde *Administración*.
Si no hay nadie más, hace falta la terminal:

```
npm run users                              ver los usuarios que hay
npx tsx scripts/users.ts ash nuevaclave
```

con el `.env` apuntando a la base de datos de Neon.

**Quiero traerme los datos que ya tenía en mi ordenador.**
Desde la carpeta antigua `npx tsx scripts/export-sqlite.ts`, y con el `.env`
apuntando a Neon, `npx tsx scripts/import-json.ts`. Esto sí necesita terminal.

---

## Preguntas razonables

**¿Esto va a costar dinero en algún momento?**
Con seis jugadores, no. Vercel Hobby es gratis para proyectos personales sin
ánimo de lucro y Neon regala 0,5 GB, que a base de sprites de 1 KB no se llena
ni de broma. Ninguno de los dos te pide tarjeta, así que tampoco pueden cobrarte
por sorpresa.

**¿Puede entrar cualquiera que sepa la dirección?**
Ver, no: sin usuario y contraseña no se pasa de la pantalla de inicio de sesión.
Y las cuentas solo las creas tú desde Administración.

**¿Y si quiero que esté en Google Play o en la App Store?**
Eso ya cuesta dinero (25 € de alta única en Google, 99 € al año en Apple) y hay
que empaquetar y mantener la app aparte. La instalación desde el navegador que
acabas de hacer da la misma experiencia para vuestro caso.

**¿Puedo seguir trasteando el código en mi ordenador?**
Sí. `npm run dev` sigue funcionando, pero usará la misma base de datos de Neon,
así que lo que borres en tu ordenador lo borras para todos. Si quieres un
entorno de pruebas aparte, en Neon puedes crear una *branch* de la base de datos
(gratis) y usar esa cadena en tu `.env` local.
