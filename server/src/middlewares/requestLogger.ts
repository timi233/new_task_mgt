import { Request, Response, NextFunction } from 'express';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('http');

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = { method: req.method, url: req.originalUrl, status: res.statusCode, duration: `${duration}ms` };

    if (res.statusCode >= 400) {
      log.warn('请求异常', logData);
    } else {
      log.debug('请求完成', logData);
    }
  });

  next();
};
