import axios from 'axios';
import { FeishuService } from './feishuService';
import { config } from '../config';
import { createModuleLogger, LogModule } from '../utils';

const log = createModuleLogger(LogModule.APPROVAL);

// 审批实例创建请求
export interface CreateApprovalRequest {
  workOrderId: string;      // 工单ID
  orderNo: string;          // 工单编号
  orderType: string;        // 工单类型 CF/MF
  customerName: string;     // 客户名称
  description: string;      // 服务内容
  customerContact?: string; // 客户联系人
  customerPhone?: string;   // 客户电话
  estimatedStartDate?: Date; // 预计开始时间
  estimatedStartPeriod?: string; // 预计开始时段 AM/PM
  estimatedEndDate?: Date;   // 预计结束时间
  estimatedEndPeriod?: string;   // 预计结束时段 AM/PM
  userId: string;           // 申请人飞书user_id
}

// 审批状态
export enum ApprovalStatus {
  PENDING = 'PENDING',   // 审批中
  APPROVED = 'APPROVED', // 已通过
  REJECTED = 'REJECTED', // 已拒绝
}

// 字段ID映射（从审批定义中获取）
const FIELD_IDS = {
  ORDER_NO: 'widget17646459880240001',        // 工单编号
  CUSTOMER_NAME: 'widget17646459981630001',   // 客户名称
  DESCRIPTION: 'widget17646460011860001',     // 服务内容
  FIELD_TYPE: 'widget17657823368860001',       // 外勤类型
  DATE_INTERVAL: 'widget17646460191710001',   // 预计服务时间
  CONTACT_PERSON: 'widget17646460247810001',  // 客户联系人
  CONTACT_PHONE: 'widget17646460277440001',   // 联系电话
};

export class ApprovalService {
  private feishuService: FeishuService;
  private baseUrl = 'https://open.feishu.cn/open-apis';
  private approvalCode: string;

  constructor() {
    this.feishuService = new FeishuService();
    this.approvalCode = config.feishu.approvalCode || '';

    if (!this.approvalCode) {
      log.warn('未配置审批模板Code，审批功能将不可用');
    }
  }

  /**
   * 创建外出审批实例
   */
  async createApprovalInstance(request: CreateApprovalRequest): Promise<string | null> {
    try {
      log.debug('接收到的参数', {
        workOrderId: request.workOrderId,
        orderNo: request.orderNo,
        estimatedStartDate: request.estimatedStartDate,
        estimatedEndDate: request.estimatedEndDate,
      });

      if (!this.approvalCode) {
        log.error('未配置审批模板Code');
        return null;
      }

      const token = await this.feishuService.getTenantAccessToken();

      // 构造审批表单数据
      const formData = [
        // 工单编号
        {
          id: FIELD_IDS.ORDER_NO,
          type: 'input',
          value: request.orderNo,
        },
        // 客户名称
        {
          id: FIELD_IDS.CUSTOMER_NAME,
          type: 'input',
          value: request.customerName,
        },
        // 服务内容
        {
          id: FIELD_IDS.DESCRIPTION,
          type: 'input',
          value: request.description,
        },
        // 外勤类型
        {
          id: FIELD_IDS.FIELD_TYPE,
          type: 'input',
          value: request.orderType === 'CF' ? '公司外勤' : '厂家外勤',
        },
        // 客户联系人
        {
          id: FIELD_IDS.CONTACT_PERSON,
          type: 'input',
          value: request.customerContact || '-',
        },
        // 联系电话
        {
          id: FIELD_IDS.CONTACT_PHONE,
          type: 'input',
          value: request.customerPhone || '-',
        },
      ];

      // 如果有预计时间，添加时间区间字段
      if (request.estimatedStartDate && request.estimatedEndDate) {
        const startDate = new Date(request.estimatedStartDate);
        const endDate = new Date(request.estimatedEndDate);

        // 计算时长（天数）：按时段计算，上午/下午各0.5天
        // 基础天数 = 日期差 + 1（包含首尾）
        // 开始是下午则减0.5，结束是上午则减0.5
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        const daysDiff = (endDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24);

        // 使用传入的时段字段判断，而非从时间戳解析（避免时区问题）
        const startIsAM = request.estimatedStartPeriod === 'AM';
        const endIsPM = request.estimatedEndPeriod === 'PM';

        // 基础天数（包含首尾）- 首日下午开始减0.5 - 末日上午结束减0.5
        let intervalDays = daysDiff + 1;
        if (!startIsAM) intervalDays -= 0.5; // 下午开始，首日只算0.5天
        if (!endIsPM) intervalDays -= 0.5;   // 上午结束，末日只算0.5天

        // 格式化为 RFC3339 格式（带时区）
        const formatToRFC3339 = (date: Date): string => {
          const pad = (n: number) => String(n).padStart(2, '0');

          const year = date.getFullYear();
          const month = pad(date.getMonth() + 1);
          const day = pad(date.getDate());
          const hours = pad(date.getHours());
          const minutes = pad(date.getMinutes());
          const seconds = pad(date.getSeconds());

          // 获取时区偏移（分钟转小时和分钟）
          const offset = -date.getTimezoneOffset();
          const offsetHours = pad(Math.floor(Math.abs(offset) / 60));
          const offsetMinutes = pad(Math.abs(offset) % 60);
          const offsetSign = offset >= 0 ? '+' : '-';

          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
        };

        const startRFC3339 = formatToRFC3339(startDate);
        const endRFC3339 = formatToRFC3339(endDate);

        log.debug('添加时间区间字段（RFC3339格式）', {
          start: startRFC3339,
          end: endRFC3339,
          interval: intervalDays,
        });

        formData.push({
          id: FIELD_IDS.DATE_INTERVAL,
          type: 'dateInterval',
          value: {
            start: startRFC3339,
            end: endRFC3339,
            interval: parseFloat(intervalDays.toFixed(1)),
          } as any,
        });
      } else {
        log.warn('预计时间为空，跳过时间区间字段', {
          estimatedStartDate: request.estimatedStartDate,
          estimatedEndDate: request.estimatedEndDate,
        });
      }

      log.info('创建审批实例', {
        approvalCode: this.approvalCode,
        workOrderId: request.workOrderId,
        userId: request.userId,
      });

      // TODO: 待 logger 中央脱敏完成后，评估是否继续输出完整表单（包含客户姓名、电话等敏感信息）
      log.debug('完整表单数据', { formData });

      // 调用飞书API创建审批实例
      const response = await axios.post(
        `${this.baseUrl}/approval/v4/instances`,
        {
          approval_code: this.approvalCode,
          user_id: request.userId,
          form: JSON.stringify(formData),
          // 可选：设置审批节点自定义审批人
          // node_approver_user_id_list: []
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.code !== 0) {
        log.error('创建审批实例失败', {
          message: response.data.msg,
          code: response.data.code,
          workOrderId: request.workOrderId,
          userId: request.userId,
          approvalCode: this.approvalCode,
        });
        return null;
      }

      const instanceCode = response.data.data.instance_code;
      log.info('审批实例创建成功', {
        instanceCode,
        workOrderId: request.workOrderId,
        userId: request.userId,
        approvalCode: this.approvalCode,
      });

      return instanceCode;
    } catch (error: any) {
      log.error('创建审批实例异常', {
        error,
        message: error.message,
        workOrderId: request.workOrderId,
        userId: request.userId,
        approvalCode: this.approvalCode,
      });
      if (error.response) {
        log.error('创建审批实例响应数据', {
          responseData: error.response.data,
          workOrderId: request.workOrderId,
          userId: request.userId,
          approvalCode: this.approvalCode,
        });
      }
      return null;
    }
  }

  /**
   * 查询审批实例状态
   */
  async getApprovalStatus(instanceCode: string): Promise<{
    status: ApprovalStatus | null;
    actualHours?: number;
    rejectReason?: string;
  } | null> {
    try {
      const token = await this.feishuService.getTenantAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/approval/v4/instances/${instanceCode}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.code !== 0) {
        log.error('查询审批状态失败', {
          message: response.data.msg,
          code: response.data.code,
          instanceCode,
        });
        return null;
      }

      const instance = response.data.data;
      const feishuStatus = instance.status;

      // 映射飞书审批状态到系统状态
      let status: ApprovalStatus | null = null;
      if (feishuStatus === 'PENDING') {
        status = ApprovalStatus.PENDING;
      } else if (feishuStatus === 'APPROVED') {
        status = ApprovalStatus.APPROVED;
      } else if (feishuStatus === 'REJECTED') {
        status = ApprovalStatus.REJECTED;
      }

      // 提取实际工时（从审批表单中）
      let actualHours: number | undefined;
      if (status === ApprovalStatus.APPROVED && instance.form) {
        try {
          const formData = typeof instance.form === 'string'
            ? JSON.parse(instance.form)
            : instance.form;

          // 查找时间区间字段
          const dateIntervalField = formData.find((f: any) => f.id === FIELD_IDS.DATE_INTERVAL);
          if (dateIntervalField && dateIntervalField.value) {
            const dateInterval = typeof dateIntervalField.value === 'string'
              ? JSON.parse(dateIntervalField.value)
              : dateIntervalField.value;

            if (dateInterval.start && dateInterval.end) {
              const hours = (dateInterval.end - dateInterval.start) / (1000 * 60 * 60);
              actualHours = Math.round(hours * 100) / 100; // 保留两位小数
            }
          }
        } catch (error) {
          log.error('解析工时失败', { error, instanceCode });
        }
      }

      // 提取拒绝原因
      let rejectReason: string | undefined;
      if (status === ApprovalStatus.REJECTED && instance.timeline) {
        try {
          const rejectNode = instance.timeline.find((t: any) =>
            t.type === 'REJECT' || t.type === 'DENIED'
          );
          if (rejectNode && rejectNode.comment) {
            rejectReason = rejectNode.comment;
          }
        } catch (error) {
          log.error('解析拒绝原因失败', { error, instanceCode });
        }
      }

      return {
        status,
        actualHours,
        rejectReason,
      };
    } catch (error: any) {
      log.error('查询审批状态异常', {
        error,
        message: error.message,
        instanceCode,
      });
      if (error.response) {
        log.error('查询审批状态响应数据', {
          responseData: error.response.data,
          instanceCode,
        });
      }
      return null;
    }
  }

  /**
   * 生成审批页面URL（用于前端跳转）
   */
  generateApprovalUrl(instanceCode: string): string {
    return `https://www.feishu.cn/approval/instance/${instanceCode}`;
  }
}
