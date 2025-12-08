import axios from 'axios';
import { config } from '../config';
import { createModuleLogger, LogModule } from '../utils';

const log = createModuleLogger(LogModule.FEISHU);

interface FeishuTokenResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number;
}

interface FeishuUserInfo {
  open_id: string;
  user_id: string;
  name: string;
  mobile?: string;
  email?: string;
  avatar_url?: string;
}

interface FeishuUserAccessTokenResponse {
  code: number;
  msg: string;
  data: {
    access_token: string;
    token_type: string;
    expires_in: number;
    name: string;
    en_name: string;
    avatar_url: string;
    avatar_thumb: string;
    avatar_middle: string;
    avatar_big: string;
    open_id: string;
    union_id: string;
    email?: string;
    mobile?: string;
  };
}

export class FeishuService {
  private baseUrl = 'https://open.feishu.cn/open-apis';
  private tenantAccessToken: string | null = null;
  private tokenExpireTime: number = 0;

  // 获取 tenant_access_token
  async getTenantAccessToken(): Promise<string> {
    // 如果 token 还有效，直接返回
    if (this.tenantAccessToken && Date.now() < this.tokenExpireTime - 60000) {
      return this.tenantAccessToken;
    }

    try {
      const response = await axios.post<FeishuTokenResponse>(
        `${this.baseUrl}/auth/v3/tenant_access_token/internal`,
        {
          app_id: config.feishu.appId,
          app_secret: config.feishu.appSecret,
        }
      );

      if (response.data.code !== 0) {
        throw new Error(`获取飞书Token失败: ${response.data.msg}`);
      }

      this.tenantAccessToken = response.data.tenant_access_token;
      this.tokenExpireTime = Date.now() + response.data.expire * 1000;

      return this.tenantAccessToken;
    } catch (error) {
      log.error('获取飞书tenant_access_token失败', { error });
      throw error;
    }
  }

  // 通过授权码获取用户信息
  async getUserByCode(code: string): Promise<FeishuUserInfo> {
    try {
      const tenantToken = await this.getTenantAccessToken();
      log.debug('获取到 tenant_access_token');

      // 第一步：获取 user_access_token
      const tokenResponse = await axios.post<FeishuUserAccessTokenResponse>(
        `${this.baseUrl}/authen/v1/oidc/access_token`,
        {
          grant_type: 'authorization_code',
          code,
        },
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: `Bearer ${tenantToken}`,
          },
        }
      );

      log.debug('access_token 响应 code', { authCode: code, responseCode: tokenResponse.data.code });

      if (tokenResponse.data.code !== 0) {
        throw new Error(`获取用户Token失败: ${tokenResponse.data.msg} (code: ${tokenResponse.data.code})`);
      }

      const userAccessToken = tokenResponse.data.data.access_token;

      // 第二步：使用 user_access_token 获取用户信息
      const userInfoResponse = await axios.get(
        `${this.baseUrl}/authen/v1/user_info`,
        {
          headers: {
            Authorization: `Bearer ${userAccessToken}`,
          },
        }
      );

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
    } catch (error: any) {
      log.error('获取飞书用户信息失败', {
        error,
        authCode: code,
        responseData: error.response?.data,
      });
      throw error;
    }
  }

  // 获取飞书用户ID（通过手机号）
  async getUserIdByMobile(mobile: string): Promise<string | null> {
    try {
      const token = await this.getTenantAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/contact/v3/users/batch_get_id`,
        {
          mobiles: [mobile],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

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
    } catch (error) {
      log.error('获取飞书用户ID失败', { error, mobile });
      return null;
    }
  }

  // 获取部门列表（递归获取所有子部门）
  async getDepartments(parentId: string = '0'): Promise<any[]> {
    try {
      const token = await this.getTenantAccessToken();
      const departments: any[] = [];
      let pageToken: string | undefined;

      do {
        const params: any = {
          department_id_type: 'open_department_id',
          parent_department_id: parentId,
          fetch_child: true, // 获取所有子部门
          page_size: 50,
        };
        if (pageToken) params.page_token = pageToken;

        const response = await axios.get(
          `${this.baseUrl}/contact/v3/departments`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params,
          }
        );

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
    } catch (error: any) {
      log.error('获取飞书部门列表失败', {
        error,
        parentId,
        responseData: error.response?.data,
      });
      return [];
    }
  }

  // 获取部门成员
  async getDepartmentMembers(departmentId: string): Promise<any[]> {
    // 跳过根部门 ID 为 0 的情况（根部门无法直接获取成员）
    if (departmentId === '0') {
      log.debug('跳过根部门成员获取', { departmentId });
      return [];
    }

    try {
      const token = await this.getTenantAccessToken();
      const members: any[] = [];
      let pageToken: string | undefined;

      do {
        const params: any = {
          department_id: departmentId,
          department_id_type: 'open_department_id',
          page_size: 50,
        };
        if (pageToken) params.page_token = pageToken;

        // 使用正确的 API 端点：/contact/v3/users/find_by_department
        const response = await axios.get(
          `${this.baseUrl}/contact/v3/users/find_by_department`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params,
          }
        );

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
    } catch (error: any) {
      log.error('获取飞书部门成员失败', {
        error,
        departmentId,
        responseData: error.response?.data,
      });
      return [];
    }
  }

  // 获取用户详细信息
  async getUserInfo(userId: string): Promise<any | null> {
    try {
      const token = await this.getTenantAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/contact/v3/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            user_id_type: 'user_id',
          },
        }
      );

      if (response.data.code !== 0) {
        log.error('获取用户详情失败', {
          message: response.data.msg,
          code: response.data.code,
          userId,
        });
        return null;
      }

      return response.data.data?.user;
    } catch (error) {
      log.error('获取飞书用户详情失败', { error, userId });
      return null;
    }
  }
}
