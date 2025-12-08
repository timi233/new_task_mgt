/**
 * 统一日志服务
 * 提供结构化、分级、带模块标签的日志输出
 */

export enum LogLevel {
  ERROR = 0,   // 错误：系统故障、异常
  WARN = 1,    // 警告：潜在问题、降级处理
  INFO = 2,    // 信息：重要业务流程
  DEBUG = 3,   // 调试：详细执行信息
}

export enum LogModule {
  // 业务模块
  WORK_ORDER = '工单',
  APPROVAL = '审批',
  USER = '用户',
  CUSTOMER = '客户',
  EVALUATION = '评价',
  STATISTICS = '统计',

  // 第三方服务
  FEISHU = '飞书',
  FEISHU_WS = '飞书WS',
  FEISHU_CALLBACK = '飞书回调',
  FEISHU_MESSAGE = '飞书消息',

  // 系统模块
  SERVER = '服务器',
  DATABASE = '数据库',
  AUTH = '认证',
  MIDDLEWARE = '中间件',

  // 其他
  SYSTEM = '系统',
}

interface LogConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamp: boolean;
}

class Logger {
  private config: LogConfig = {
    level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
    enableColors: process.env.NODE_ENV !== 'production',
    enableTimestamp: true,
  };

  // 颜色代码
  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
  };

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel) {
    this.config.level = level;
  }

  /**
   * 格式化时间戳
   */
  private formatTimestamp(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }

  /**
   * 应用颜色
   */
  private colorize(text: string, color: string): string {
    if (!this.config.enableColors) return text;
    return `${color}${text}${this.colors.reset}`;
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(
    level: LogLevel,
    module: LogModule | string,
    message: string,
    data?: any
  ): string {
    const parts: string[] = [];

    // 时间戳
    if (this.config.enableTimestamp) {
      const timestamp = this.colorize(this.formatTimestamp(), this.colors.gray);
      parts.push(timestamp);
    }

    // 日志级别
    let levelStr = '';
    let levelColor = this.colors.reset;

    switch (level) {
      case LogLevel.ERROR:
        levelStr = 'ERROR';
        levelColor = this.colors.red + this.colors.bright;
        break;
      case LogLevel.WARN:
        levelStr = 'WARN ';
        levelColor = this.colors.yellow;
        break;
      case LogLevel.INFO:
        levelStr = 'INFO ';
        levelColor = this.colors.blue;
        break;
      case LogLevel.DEBUG:
        levelStr = 'DEBUG';
        levelColor = this.colors.cyan;
        break;
    }
    parts.push(this.colorize(levelStr, levelColor));

    // 模块标签
    const moduleStr = `[${module}]`;
    parts.push(this.colorize(moduleStr, this.colors.bright));

    // 消息
    parts.push(message);

    return parts.join(' ');
  }

  /**
   * 输出日志
   */
  private log(level: LogLevel, module: LogModule | string, message: string, data?: any) {
    if (level > this.config.level) return;

    const formattedMessage = this.formatMessage(level, module, message, data);

    // 根据级别选择输出方法
    if (level === LogLevel.ERROR) {
      console.error(formattedMessage);
      if (data !== undefined) {
        console.error(data);
      }
    } else if (level === LogLevel.WARN) {
      console.warn(formattedMessage);
      if (data !== undefined) {
        console.warn(data);
      }
    } else {
      console.log(formattedMessage);
      if (data !== undefined) {
        console.log(data);
      }
    }
  }

  /**
   * ERROR 级别日志
   */
  error(module: LogModule | string, message: string, error?: any) {
    this.log(LogLevel.ERROR, module, message, error);
  }

  /**
   * WARN 级别日志
   */
  warn(module: LogModule | string, message: string, data?: any) {
    this.log(LogLevel.WARN, module, message, data);
  }

  /**
   * INFO 级别日志
   */
  info(module: LogModule | string, message: string, data?: any) {
    this.log(LogLevel.INFO, module, message, data);
  }

  /**
   * DEBUG 级别日志
   */
  debug(module: LogModule | string, message: string, data?: any) {
    this.log(LogLevel.DEBUG, module, message, data);
  }

  /**
   * 创建模块专用日志器
   */
  module(module: LogModule | string) {
    return {
      error: (message: string, error?: any) => this.error(module, message, error),
      warn: (message: string, data?: any) => this.warn(module, message, data),
      info: (message: string, data?: any) => this.info(module, message, data),
      debug: (message: string, data?: any) => this.debug(module, message, data),
    };
  }
}

// 导出单例
export const logger = new Logger();

// 导出便捷方法
export const createModuleLogger = (module: LogModule | string) => logger.module(module);
