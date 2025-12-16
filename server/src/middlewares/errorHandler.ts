import { Request, Response, NextFunction } from 'express';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('error-handler');

export interface AppError extends Error {
  statusCode?: number;
  code?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  log.error('请求处理错误', { method: req.method, path: req.path, error: err.message, stack: err.stack });

  const statusCode = err.statusCode || 500;
  const code = err.code || 5000;
  const message = err.message || '服务器内部错误';

  res.status(statusCode).json({
    code,
    message,
    data: null,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export class ApiError extends Error {
  statusCode: number;
  code: number;

  constructor(message: string, statusCode: number = 500, code: number = 5000) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string = '参数错误') {
    return new ApiError(message, 400, 1001);
  }

  static unauthorized(message: string = '未授权') {
    return new ApiError(message, 401, 1002);
  }

  static forbidden(message: string = '权限不足') {
    return new ApiError(message, 403, 1003);
  }

  static notFound(message: string = '资源不存在') {
    return new ApiError(message, 404, 1004);
  }

  static businessError(message: string = '业务逻辑错误') {
    return new ApiError(message, 400, 1005);
  }

  static internal(message: string = '服务器内部错误') {
    return new ApiError(message, 500, 5000);
  }
}
