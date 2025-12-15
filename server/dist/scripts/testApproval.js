"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const approvalService_1 = require("../feishu/approvalService");
async function testApproval() {
    const approvalService = new approvalService_1.ApprovalService();
    console.log('开始测试审批创建...\n');
    const testData = {
        workOrderId: 'test-order-001',
        orderNo: 'CF20251202999',
        orderType: 'CF',
        customerName: '测试客户公司',
        description: '测试服务内容：系统维护和故障排查',
        customerContact: '张三',
        customerPhone: '13800138000',
        estimatedStartDate: new Date('2025-12-02T00:00:00+08:00'),
        estimatedEndDate: new Date('2025-12-05T00:00:00+08:00'),
        userId: 'a2e9eg2d',
    };
    console.log('测试数据:', {
        orderNo: testData.orderNo,
        customerName: testData.customerName,
        estimatedStartDate: testData.estimatedStartDate.toISOString(),
        estimatedEndDate: testData.estimatedEndDate.toISOString(),
    });
    console.log('');
    try {
        const instanceCode = await approvalService.createApprovalInstance(testData);
        if (instanceCode) {
            console.log('\n✅ 审批实例创建成功！');
            console.log('实例代码:', instanceCode);
            console.log('\n请到飞书中查看审批通知');
        }
        else {
            console.log('\n❌ 审批实例创建失败（返回null）');
        }
    }
    catch (error) {
        console.error('\n❌ 测试失败:', error);
    }
}
testApproval();
//# sourceMappingURL=testApproval.js.map