import { Request } from 'express';
import { RolesEnum } from '../decorators/roles.decorator';

export interface IJwtPayload {
  id: string;
  email: string;
  role: RolesEnum;
  exp: string;
  iat: string;
}

export interface IAuthRequest extends Request {
  user: IJwtPayload;
  tokenExpiresAt: string;
}
