"use strict";
/**
 * 这是使用新日志服务改造后的 approvalService.ts 示例
 * 展示如何替换原有的 console.log/error 为结构化日志
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalService = void 0;
const axios_1 = __importDefault(require("axios"));
const feishuService_1 = require("./feishuService");
const config_1 = require("../config");
const utils_1 = require("../utils");
// 创建审批模块专用日志器
const log = (0, utils_1.createModuleLogger)(utils_1.LogModule.APPROVAL);
// ... 接口和枚举定义保持不变 ...
class ApprovalService {
    constructor() {
        this.baseUrl = 'https://open.feishu.cn/open-apis';
        this.feishuService = new feishuService_1.FeishuService();
        this.approvalCode = config_1.config.feishu.approvalCode || '';
        if (!this.approvalCode) {
            // 改造前: console.warn('[审批服务] 未配置审批模板Code，审批功能将不可用');
            log.warn('未配置审批模板Code，审批功能将不可用');
        }
    }
    /**
     * 创建外出审批实例
     */
    async createApprovalInstance(request) {
        try {
            // 改造前: console.log('[审批服务] 接收到的参数:', {...});
            log.debug('接收到创建审批请求', {
                workOrderId: request.workOrderId,
                orderNo: request.orderNo,
                estimatedStartDate: request.estimatedStartDate,
                estimatedEndDate: request.estimatedEndDate,
            });
            if (!this.approvalCode) {
                // 改造前: console.error('[审批服务] 未配置审批模板Code');
                log.error('未配置审批模板Code');
                return null;
            }
            const token = await this.feishuService.getTenantAccessToken();
            // ... 构造表单数据 ...
            if (request.estimatedStartDate && request.estimatedEndDate) {
                // 改造前: console.log('[审批服务] 添加时间区间字段（RFC3339格式）:', {...});
                log.debug('添加时间区间字段', {
                    start: startRFC3339,
                    end: endRFC3339,
                    interval: intervalDays,
                });
            }
            else {
                // 改造前: console.warn('[审批服务] 预计时间为空，跳过时间区间字段:', {...});
                log.warn('预计时间为空，跳过时间区间字段', {
                    estimatedStartDate: request.estimatedStartDate,
                    estimatedEndDate: request.estimatedEndDate,
                });
            }
            // 改造前: console.log('[审批服务] 创建审批实例:', {...});
            log.info('调用飞书API创建审批实例', {
                approvalCode: this.approvalCode,
                workOrderId: request.workOrderId,
                userId: request.userId,
            });
            // 改造前: console.log('[审批服务] 完整表单数据:', JSON.stringify(formData, null, 2));
            log.debug('完整表单数据', formData);
            // 调用飞书API
            const response = await axios_1.default.post(`${this.baseUrl}/approval/v4/instances`, {
                approval_code: this.approvalCode,
                user_id: request.userId,
                form: JSON.stringify(formData),
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.data.code !== 0) {
                // 改造前: console.error('[审批服务] 创建审批实例失败:', response.data.msg);
                log.error('创建审批实例失败', {
                    code: response.data.code,
                    msg: response.data.msg,
                });
                return null;
            }
            const instanceCode = response.data.data.instance_code;
            // 改造前: console.log('[审批服务] 审批实例创建成功:', instanceCode);
            log.info('审批实例创建成功', {
                instanceCode,
                orderNo: request.orderNo,
            });
            return instanceCode;
        }
        catch (error) {
            // 改造前: console.error('[审批服务] 创建审批实例异常:', error.message);
            log.error('创建审批实例异常', {
                message: error.message,
                response: error.response?.data,
            });
            // 改造前: if (error.response) { console.error(...) }
            // 现在数据已经包含在上面的 log.error 中
            return null;
        }
    }
    /**
     * 查询审批实例状态
     */
    async getApprovalStatus(instanceCode) {
        try {
            const token = await this.feishuService.getTenantAccessToken();
            const response = await axios_1.default.get(`${this.baseUrl}/approval/v4/instances/${instanceCode}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.data.code !== 0) {
                log.error('查询审批状态失败', {
                    instanceCode,
                    code: response.data.code,
                    msg: response.data.msg,
                });
                return null;
            }
            log.debug('查询审批状态成功', {
                instanceCode,
                status: response.data.data.status,
            });
            // ... 处理返回数据 ...
        }
        catch (error) {
            log.error('查询审批状态异常', {
                instanceCode,
                message: error.message,
                response: error.response?.data,
            });
            return null;
        }
    }
}
exports.ApprovalService = ApprovalService;
//# sourceMappingURL=approvalService.example.js.map