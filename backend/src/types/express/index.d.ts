import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id?: string;
        role?: string;
        adminId?: string;
        doctorId?: string;
        userId?: string;
        email?: string;
        [key: string]: any;
      };
    }
  }
}
