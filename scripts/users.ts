/**
 * Utilidad de rescate para cuando no puedes entrar en la aplicación.
 *
 *   npx tsx scripts/users.ts                      -> lista los usuarios que hay
 *   npx tsx scripts/users.ts admin nuevaclave     -> cambia la contraseña de "admin"
 *
 * También sirve para comprobar de un vistazo si la base de datos que está
 * usando esta carpeta es la que crees.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [username, password] = process.argv.slice(2);

  if (!username) {
    const users = await prisma.user.findMany({
      orderBy: { username: "asc" },
      include: { _count: { select: { participations: true } } },
    });

    console.log(`\nBase de datos: ${process.env.DATABASE_URL ?? "(sin DATABASE_URL)"}`);

    if (!users.length) {
      console.log(`
No hay ningún usuario en esta base de datos, está vacía.

Opciones:
  - Si tenías datos en otra carpeta, copia su fichero prisma/dev.db aquí
    (y también dev.db-wal y dev.db-shm si existen).
  - Si quieres empezar de cero con los datos de ejemplo: npm run db:seed
`);
      return;
    }

    console.log(`\n${users.length} usuario(s):\n`);
    for (const user of users) {
      console.log(
        `  ${user.username.padEnd(12)} ${user.displayName.padEnd(16)} ${user.role.padEnd(7)} ${user._count.participations} competiciones`,
      );
    }
    console.log(`
Para cambiar una contraseña:
  npx tsx scripts/users.ts <usuario> <nueva-contraseña>
`);
    return;
  }

  if (!password || password.length < 6) {
    console.error("La contraseña nueva debe tener al menos 6 caracteres.");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
  });
  if (!user) {
    console.error(
      `No existe el usuario "${username}". Ejecuta el script sin argumentos para ver la lista.`,
    );
    process.exitCode = 1;
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });

  console.log(`\nListo. Ya puedes entrar como "${user.username}" con esa contraseña.\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
