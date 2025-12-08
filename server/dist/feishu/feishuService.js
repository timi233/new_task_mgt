"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeishuService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const utils_1 = require("../utils");
const log = (0, utils_1.createModuleLogger)(utils_1.LogModule.FEISHU);
class FeishuService {
    constructor() {
        this.baseUrl = 'https://open.feishu.cn/open-apis';
        this.tenantAccessToken = null;
        this.tokenExpireTime = 0;
    }
    // 获取 tenant_access_token
    async getTenantAccessToken() {
        // 如果 token 还有效，直接返回
        if (this.tenantAccessToken && Date.now() < this.tokenExpireTime - 60000) {
            return this.tenantAccessToken;
        }
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/auth/v3/tenant_access_token/internal`, {
                app_id: config_1.config.feishu.appId,
                app_secret: config_1.config.feishu.appSecret,
            });
            if (response.data.code !== 0) {
                throw new Error(`获取飞书Token失败: ${response.data.msg}`);
            }
            this.tenantAccessToken = response.data.tenant_access_token;
            this.tokenExpireTime = Date.now() + response.data.expire * 1000;
            return this.tenantAccessToken;
        }
        catch (error) {
            log.error('获取飞书tenant_access_token失败', { error });
            throw error;
        }
    }
    // 通过授权码获取用户信息
    async getUserByCode(code) {
        try {
            const tenantToken = await this.getTenantAccessToken();
            log.debug('获取到 tenant_access_token');
            // 第一步：获取 user_access_token
            const tokenResponse = await axios_1.default.post(`${this.baseUrl}/authen/v1/oidc/access_token`, {
                grant_type: 'authorization_code',
                code,
            }, {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    Authorization: `Bearer ${tenantToken}`,
                },
            });
            log.debug('access_token 响应 code', { authCode: code, responseCode: tokenResponse.data.code });
            if (tokenResponse.data.code !== 0) {
                throw new Error(`获取用户Token失败: ${tokenResponse.data.msg} (code: ${tokenResponse.data.code})`);
            }
            const userAccessToken = tokenResponse.data.data.access_token;
            // 第二步：使用 user_access_token 获取用户信息
            const userInfoResponse = await axios_1.default.get(`${this.baseUrl}/authen/v1/user_info`, {
                headers: {
                    Authorization: `Bearer ${userAccessToken}`,
                },
            });
            log.debug('user_info 响应', { data: userInfoResponse.data });
            if (userInfoResponse.data.code !== 0) {
                throw new Error(`获取用户信息失败: ${userInfoResponse.data.msg} (code: ${userInfoResponse.data.code})`);
            }
            const userData = userInfoResponse.data.data;
            if (!userData || !userData.open_id) {
                log.error('用户数据异常', { data: userData });
                throw new Error('飞书返回的用户数据无效');
            }
            return {
                open_id: userData.open_id,
                user_id: userData.user_id,
                name: userData.name,
                mobile: userData.mobile,
                email: userData.email,
                avatar_url: userData.avatar_url,
            };
        }
        catch (error) {
            log.error('获取飞书用户信息失败', {
                error,
                authCode: code,
                responseData: error.response?.data,
            });
            throw error;
        }
    }
    // 获取飞书用户ID（通过手机号）
    async getUserIdByMobile(mobile) {
        try {
            const token = await this.getTenantAccessToken();
            const response = await axios_1.default.post(`${this.baseUrl}/contact/v3/users/batch_get_id`, {
                mobiles: [mobile],
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.data.code !== 0) {
                log.error('查询用户ID失败', {
                    message: response.data.msg,
                    code: response.data.code,
                    mobile,
                });
                return null;
            }
            const userList = response.data.data?.user_list;
            if (userList && userList.length > 0 && userList[0].user_id) {
                return userList[0].user_id;
            }
            return null;
        }
        catch (error) {
            log.error('获取飞书用户ID失败', { error, mobile });
            return null;
        }
    }
    // 获取部门列表（递归获取所有子部门）
    async getDepartments(parentId = '0') {
        try {
            const token = await this.getTenantAccessToken();
            const departments = [];
            let pageToken;
            do {
                const params = {
                    department_id_type: 'open_department_id',
                    parent_department_id: parentId,
                    fetch_child: true, // 获取所有子部门
                    page_size: 50,
                };
                if (pageToken)
                    params.page_token = pageToken;
                const response = await axios_1.default.get(`${this.baseUrl}/contact/v3/departments`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    params,
                });
                if (response.data.code !== 0) {
                    log.error('获取部门列表失败', {
                        message: response.data.msg,
                        code: response.data.code,
                        parentId,
                        pageToken,
                    });
                    break;
                }
                const items = response.data.data?.items || [];
                log.info('获取部门列表', {
                    count: items.length,
                    parentId,
                    pageToken,
                });
                departments.push(...items);
                pageToken = response.data.data?.page_token;
            } while (pageToken);
            return departments;
        }
        catch (error) {
            log.error('获取飞书部门列表失败', {
                error,
                parentId,
                responseData: error.response?.data,
            });
            return [];
        }
    }
    // 获取部门成员
    async getDepartmentMembers(departmentId) {
        // 跳过根部门 ID 为 0 的情况（根部门无法直接获取成员）
        if (departmentId === '0') {
            log.debug('跳过根部门成员获取', { departmentId });
            return [];
        }
        try {
            const token = await this.getTenantAccessToken();
            const members = [];
            let pageToken;
            do {
                const params = {
                    department_id: departmentId,
                    department_id_type: 'open_department_id',
                    page_size: 50,
                };
                if (pageToken)
                    params.page_token = pageToken;
                // 使用正确的 API 端点：/contact/v3/users/find_by_department
                const response = await axios_1.default.get(`${this.baseUrl}/contact/v3/users/find_by_department`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    params,
                });
                if (response.data.code !== 0) {
                    log.error('获取部门成员失败', {
                        departmentId,
                        message: response.data.msg,
                        code: response.data.code,
                        pageToken,
                    });
                    break;
                }
                const items = response.data.data?.items || [];
                log.debug('获取部门成员', {
                    departmentId,
                    count: items.length,
                    pageToken,
                });
                members.push(...items);
                pageToken = response.data.data?.page_token;
            } while (pageToken);
            return members;
        }
        catch (error) {
            log.error('获取飞书部门成员失败', {
                error,
                departmentId,
                responseData: error.response?.data,
            });
            return [];
        }
    }
    // 获取用户详细信息
    async getUserInfo(userId) {
        try {
            const token = await this.getTenantAccessToken();
            const response = await axios_1.default.get(`${this.baseUrl}/contact/v3/users/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: {
                    user_id_type: 'user_id',
                },
            });
            if (response.data.code !== 0) {
                log.error('获取用户详情失败', {
                    message: response.data.msg,
                    code: response.data.code,
                    userId,
                });
                return null;
            }
            return response.data.data?.user;
        }
        catch (error) {
            log.error('获取飞书用户详情失败', { error, userId });
            return null;
        }
    }
}
exports.FeishuService = FeishuService;
//# sourceMappingURL=feishuService.js.map