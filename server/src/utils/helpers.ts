import { prisma } from './prisma';

// 生成工单编号：类型 + 日期 + 序号
// 例如：CF20250115001
export const generateOrderNo = async (orderType: string): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `${orderType}${dateStr}`;

  // 查询今天该类型的最大编号
  const lastOrder = await prisma.workOrder.findFirst({
    where: {
      orderNo: {
        startsWith: prefix,
      },
    },
    orderBy: {
      orderNo: 'desc',
    },
    select: {
      orderNo: true,
    },
  });

  let sequence = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderNo.slice(-3), 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(3, '0')}`;
};

// 格式化日期 (北京时间)
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 格式化日期时间 (北京时间)
export const formatDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// 计算工时差
export const calculateHours = (start: Date, end: Date): number => {
  const diff = end.getTime() - start.getTime();
  return Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
};
