import { FeishuService } from '../feishu/feishuService';
import axios from 'axios';

const APPROVAL_CODE = '1E9D3E8F-15CF-45C9-BC93-2483DDBF9A9A';

async function getApprovalDefinition() {
  try {
    const feishuService = new FeishuService();
    const token = await feishuService.getTenantAccessToken();

    console.log('✅ 成功获取 tenant_access_token');
    console.log('');

    // 调用飞书API获取审批定义详情
    const response = await axios.get(
      `https://open.feishu.cn/open-apis/approval/v4/approvals/${APPROVAL_CODE}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.code !== 0) {
      console.error('❌ 获取审批定义失败:', response.data.msg);
      console.error('错误码:', response.data.code);
      return;
    }

    const approvalData = response.data.data;

    // 解析 form 字段（它是JSON字符串）
    const formFields = typeof approvalData.form === 'string'
      ? JSON.parse(approvalData.form)
      : approvalData.form;

    console.log('📋 审批定义基本信息:');
    console.log('审批名称:', approvalData.approval_name);
    console.log('审批Code:', APPROVAL_CODE);
    console.log('状态:', approvalData.status);
    console.log('');

    console.log('📝 表单字段信息:');
    console.log('字段总数:', formFields?.length || 0);
    console.log('');

    if (Array.isArray(formFields) && formFields.length > 0) {
      console.log('字段详情:');
      formFields.forEach((field: any, index: number) => {
        console.log(`\n[字段 ${index + 1}]`);
        console.log('  字段ID:', field.id);
        console.log('  字段名称:', field.name);
        console.log('  字段类型:', field.type);
        console.log('  是否必填:', field.required ? '是' : '否');
        if (field.option) {
          console.log('  特殊选项:', JSON.stringify(field.option, null, 4));
        }
      });

      console.log('\n');
      console.log('='.repeat(60));
      console.log('📊 字段映射配置（复制到代码中使用）:');
      console.log('='.repeat(60));

      const fieldMapping: any = {};
      formFields.forEach((field: any) => {
        const cleanName = field.name.replace(/\s+/g, '');
        fieldMapping[cleanName] = field.id;
      });

      console.log(JSON.stringify(fieldMapping, null, 2));
    } else {
      console.log('⚠️  未找到表单字段，请检查审批定义配置');
    }

    console.log('\n');
    console.log('✅ 审批定义信息获取完成！');
    console.log('');
    console.log('💡 提示：');
    console.log('1. 请将上面的字段映射配置复制保存');
    console.log('2. 在创建审批实例时使用这些字段ID');
    console.log('3. 确保飞书应用已开通"审批"权限');

  } catch (error: any) {
    console.error('❌ 发生错误:', error.message);
    if (error.response) {
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

getApprovalDefinition();
