import { Request, Response, NextFunction } from 'express';
import { RoleType, FunctionalRoleType, ResponsibilityRoleType } from '../types';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        feishuId: string | null;
        name: string;
        role: string | null;
        functionalRole: string | null;
        responsibilityRole: string | null;
    };
}
export declare const resolveLegacyRole: (payload: {
    role?: string | null;
    functionalRole?: string | null;
    responsibilityRole?: string | null;
}) => RoleType | null;
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (...allowedRoles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare function requireResponsibility(...roles: ResponsibilityRoleType[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare function requireFunction(...roles: FunctionalRoleType[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare function requireBoth(functionalRoles: FunctionalRoleType[], responsibilityRoles: ResponsibilityRoleType[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare function requireEither(functionalRoles?: FunctionalRoleType[], responsibilityRoles?: ResponsibilityRoleType[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map