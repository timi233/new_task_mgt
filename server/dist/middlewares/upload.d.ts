import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
export declare const followUpUpload: multer.Multer;
/**
 * 文件签名验证中间件
 * 在 multer 上传后执行，验证文件实际内容与声明的 MIME 类型是否匹配
 */
export declare function validateFileSignatures(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare const UPLOAD_DIR_PATH: string;
//# sourceMappingURL=upload.d.ts.map