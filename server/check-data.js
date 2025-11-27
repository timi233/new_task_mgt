const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    // 查找张健
    const user = await prisma.user.findFirst({
      where: { name: '张健' }
    });
    console.log('张健用户信息:', JSON.stringify(user, null, 2));

    // 查询所有待处理工单
    const orders = await prisma.workOrder.findMany({
      where: { status: { in: ['PENDING', 'ACCEPTED', 'IN_SERVICE'] } },
      include: {
        technicians: {
          include: {
            technician: { select: { id: true, name: true } }
          }
        }
      },
      take: 5
    });
    console.log('\n待处理工单数量:', orders.length);
    console.log('待处理工单:', JSON.stringify(orders, null, 2));

    if (user && orders.length > 0) {
      // 检查张健被分配的工单
      const userOrders = await prisma.workOrder.findMany({
        where: {
          technicians: { some: { technicianId: user.id } },
          status: { in: ['PENDING', 'ACCEPTED', 'IN_SERVICE'] }
        },
        include: {
          technicians: {
            include: {
              technician: { select: { id: true, name: true } }
            }
          }
        }
      });
      console.log('\n张健的待处理工单:', JSON.stringify(userOrders, null, 2));
    }
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
