import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查找张健用户
  const user = await prisma.user.findFirst({
    where: { name: '张健' }
  });

  if (user) {
    console.log('找到用户:', user.name, '当前角色:', user.role);

    // 更新为管理员
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' }
    });

    console.log('✅ 已更新为管理员:', updated.name, '新角色:', updated.role);
  } else {
    console.log('未找到用户: 张健');

    // 列出所有用户
    const users = await prisma.user.findMany();
    console.log('当前用户列表:');
    users.forEach(u => console.log(`  - ${u.name} (${u.role})`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
