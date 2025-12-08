import { Response } from 'express';
export declare const success: <T>(res: Response, data: T, message?: string) => Response<any, Record<string, any>>;
export declare const paginate: <T>(res: Response, data: T[], total: number, page: number, pageSize: number, message?: string) => Response<any, Record<string, any>>;
export declare const fail: (res: Response, message: string, code?: number, statusCode?: number) => Response<any, Record<string, any>>;
//# sourceMappingURL=response.d.ts.map