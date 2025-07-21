import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { IAuthRequest, IJwtPayload } from '../interfaces/token.interface';

@Injectable()
export class AuthenticatedUserGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<IAuthRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    const token = authHeader.split(' ')[1];

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify<IJwtPayload>(token, { secret });
      payload.iat = new Date().toLocaleString('en-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      payload.exp = new Date().toLocaleString('en-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      request.user = payload;
      request.tokenExpiresAt = payload.exp;

      return true;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException(
          `The token expired on: ${error.expiredAt.toLocaleString('en-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}`,
        );
      }
      throw new UnauthorizedException('Invalid Token');
    }
  }
}
