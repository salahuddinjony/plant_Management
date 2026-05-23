import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload & {
        staffRole?: string;
        permissions?: string[];
      };
    }
  }
}

export {};
