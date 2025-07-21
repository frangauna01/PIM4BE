import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { IAuthRequest } from '../../auth/interfaces/token.interface';
import { RolesEnum } from '../decorators/roles.decorator';
import { validate as isUuid } from 'uuid';
import { OrdersService } from '../../orders/orders.service';

@Injectable()
export class OrderOwnerOrAdminGuard implements CanActivate {
  constructor(private readonly ordersService: OrdersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IAuthRequest>();
    const user = request.user;
    const orderId = request.params.id;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role.includes(RolesEnum.ADMIN)) {
      return true;
    }

    if (!orderId || !isUuid(orderId)) {
      throw new BadRequestException('Validation failed (uuid is expected)');
    }

    const order = await this.ordersService.findById(orderId);

    if (order.user.id !== user.id) {
      throw new ForbiddenException('You are not allowed to modify this order');
    }

    return true;
  }
}
