import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询所有 functionalRole 为空的用户
  const users = await prisma.user.findMany({
    where: {
      functionalRole: null,
    },
    select: {
      id: true,
      name: true,
      role: true,
      functionalRole: true,
      responsibilityRole: true,
    },
  });
  
  console.log('需要更新的用户:', users);
  
  // 更新所有 functionalRole 为空但 role 是 TECHNICIAN 的用户
  const result = await prisma.user.updateMany({
    where: {
      functionalRole: null,
      role: 'TECHNICIAN',
    },
    data: {
      functionalRole: 'TECHNICIAN',
    },
  });
  
  console.log('更新结果:', result);
  
  // 再次查询验证
  const updatedUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      functionalRole: true,
      responsibilityRole: true,
    },
  });
  
  console.log('更新后的用户:', updatedUsers);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
