const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      functionalRole: true,
      responsibilityRole: true,
      status: true
    }
  });

  console.log('所有用户权限信息：');
  console.log('='.repeat(80));
  users.forEach(user => {
    console.log(`ID: ${user.id}`);
    console.log(`姓名: ${user.name}`);
    console.log(`旧角色: ${user.role || '无'}`);
    console.log(`功能权限: ${user.functionalRole || '无'}`);
    console.log(`职责权限: ${user.responsibilityRole || '无'}`);
    console.log(`状态: ${user.status}`);
    console.log('-'.repeat(80));
  });

  await prisma.$disconnect();
}

main().catch(console.error);
