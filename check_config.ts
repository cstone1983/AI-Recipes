import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const config = await prisma.globalConfig.findUnique({ where: { id: 'default' } });
  console.log(JSON.stringify(config, null, 2));
}
main();
