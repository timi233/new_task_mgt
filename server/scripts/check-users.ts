import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 将张健设置为系统管理员
  const updated = await prisma.user.update({
    where: { id: 'cmifmdgt20000gs79ceks01oq' },
    data: { role: 'SYSTEM_ADMIN' },
  });

  console.log(`✅ 已将 ${updated.name} 的角色更新为 SYSTEM_ADMIN`);

  // 显示更新后的用户列表
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, status: true },
  });

  console.log('\n当前用户列表:');
  console.table(users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
