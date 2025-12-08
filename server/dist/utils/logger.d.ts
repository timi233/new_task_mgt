/**
 * 统一日志服务
 * 提供结构化、分级、带模块标签的日志输出
 */
export declare enum LogLevel {
    ERROR = 0,// 错误：系统故障、异常
    WARN = 1,// 警告：潜在问题、降级处理
    INFO = 2,// 信息：重要业务流程
    DEBUG = 3
}
export declare enum LogModule {
    WORK_ORDER = "\u5DE5\u5355",
    APPROVAL = "\u5BA1\u6279",
    USER = "\u7528\u6237",
    CUSTOMER = "\u5BA2\u6237",
    EVALUATION = "\u8BC4\u4EF7",
    STATISTICS = "\u7EDF\u8BA1",
    FEISHU = "\u98DE\u4E66",
    FEISHU_WS = "\u98DE\u4E66WS",
    FEISHU_CALLBACK = "\u98DE\u4E66\u56DE\u8C03",
    FEISHU_MESSAGE = "\u98DE\u4E66\u6D88\u606F",
    SERVER = "\u670D\u52A1\u5668",
    DATABASE = "\u6570\u636E\u5E93",
    AUTH = "\u8BA4\u8BC1",
    MIDDLEWARE = "\u4E2D\u95F4\u4EF6",
    SYSTEM = "\u7CFB\u7EDF"
}
declare class Logger {
    private config;
    private colors;
    /**
     * 设置日志级别
     */
    setLevel(level: LogLevel): void;
    /**
     * 格式化时间戳
     */
    private formatTimestamp;
    /**
     * 应用颜色
     */
    private colorize;
    /**
     * 格式化日志消息
     */
    private formatMessage;
    /**
     * 输出日志
     */
    private log;
    /**
     * ERROR 级别日志
     */
    error(module: LogModule | string, message: string, error?: any): void;
    /**
     * WARN 级别日志
     */
    warn(module: LogModule | string, message: string, data?: any): void;
    /**
     * INFO 级别日志
     */
    info(module: LogModule | string, message: string, data?: any): void;
    /**
     * DEBUG 级别日志
     */
    debug(module: LogModule | string, message: string, data?: any): void;
    /**
     * 创建模块专用日志器
     */
    module(module: LogModule | string): {
        error: (message: string, error?: any) => void;
        warn: (message: string, data?: any) => void;
        info: (message: string, data?: any) => void;
        debug: (message: string, data?: any) => void;
    };
}
export declare const logger: Logger;
export declare const createModuleLogger: (module: LogModule | string) => {
    error: (message: string, error?: any) => void;
    warn: (message: string, data?: any) => void;
    info: (message: string, data?: any) => void;
    debug: (message: string, data?: any) => void;
};
export {};
//# sourceMappingURL=logger.d.ts.map