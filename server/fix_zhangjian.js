const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 查找张健用户
  const user = await prisma.user.findFirst({
    where: { name: '张健' }
  });

  if (user) {
    console.log('找到用户:', user.name);
    console.log('当前权限:', {
      functionalRole: user.functionalRole || '无',
      responsibilityRole: user.responsibilityRole || '无'
    });

    // 更新张健的功能权限为TECHNICIAN
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { 
        functionalRole: 'TECHNICIAN'
      }
    });

    console.log('\n✅ 已更新张健的权限:');
    console.log('功能权限:', updated.functionalRole);
    console.log('职责权限:', updated.responsibilityRole);
  } else {
    console.log('未找到用户: 张健');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
