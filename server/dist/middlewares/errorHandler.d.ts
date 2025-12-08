import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    code?: number;
}
export declare const errorHandler: (err: AppError, req: Request, res: Response, next: NextFunction) => void;
export declare class ApiError extends Error {
    statusCode: number;
    code: number;
    constructor(message: string, statusCode?: number, code?: number);
    static badRequest(message?: string): ApiError;
    static unauthorized(message?: string): ApiError;
    static forbidden(message?: string): ApiError;
    static notFound(message?: string): ApiError;
    static businessError(message?: string): ApiError;
    static internal(message?: string): ApiError;
}
//# sourceMappingURL=errorHandler.d.ts.map