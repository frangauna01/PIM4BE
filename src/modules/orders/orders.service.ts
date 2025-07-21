import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { OrderDetails } from '../order-details/entities/order-details.entity';
import { TransactionHelper } from '../utils/helpers/transaction.helper';
import { RolesEnum } from '../auth/decorators/roles.decorator';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly transactionHelper: TransactionHelper,
  ) {}

  async findAll(
    userId: string,
    isAdmin: boolean,
    page: number,
    limit: number,
  ): Promise<Order[]> {
    const where = isAdmin ? {} : { user: { id: userId } };

    const [orders, total] = await this.ordersRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });

    if (!total) throw new NotFoundException('There are currently no orders');

    const totalPages = Math.ceil(total / limit);

    if (page > totalPages && total > 0) {
      throw new BadRequestException(
        `The requested page (${page}) exceeds the maximum (${totalPages})`,
      );
    }

    return orders;
  }

  async findById(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['user', 'orderDetails.product'],
    });

    if (!order) throw new NotFoundException(`Order with UUID ${id} not found`);

    return order;
  }

  async save(
    userId: string,
    products: { id: string; quantity: number }[],
    userIdFromToken: string,
    userRole: RolesEnum,
  ): Promise<Order> {
    if (!userId || !Array.isArray(products) || products.length === 0) {
      throw new BadRequestException('User ID and product list are required');
    }

    if (userRole.includes(RolesEnum.USER) && userId !== userIdFromToken) {
      throw new UnauthorizedException(
        'You cannot create an order for another user',
      );
    }

    for (const { id, quantity } of products) {
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new BadRequestException(`Invalid quantity for product ${id}`);
      }
    }

    return this.transactionHelper.runInTransaction(async (queryRunner) => {
      const userRepo = queryRunner.manager.getRepository(User);
      const productRepo = queryRunner.manager.getRepository(Product);
      const orderRepo = queryRunner.manager.getRepository(Order);
      const orderDetailsRepo = queryRunner.manager.getRepository(OrderDetails);

      const user = await userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const productIds = products.map((p) => p.id);
      const foundProducts = await productRepo.findBy({ id: In(productIds) });

      const foundProductIds = foundProducts.map((p) => p.id);
      const foundProductIdsSet = new Set(foundProductIds);
      const notFoundIds = productIds.filter(
        (id) => !foundProductIdsSet.has(id),
      );

      if (notFoundIds.length > 0) {
        throw new NotFoundException(
          `Products not found: ${notFoundIds.join(', ')}`,
        );
      }

      const productCountMap: Record<string, number> = {};
      for (const { id, quantity } of products) {
        productCountMap[id] = (productCountMap[id] || 0) + quantity;
      }

      let total = 0;
      const orderDetailsToInsert: OrderDetails[] = [];

      for (const product of foundProducts) {
        const quantity = productCountMap[product.id];

        if (product.stock < quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.name}. Available: ${product.stock}`,
          );
        }

        const subtotal = Number((Number(product.price) * quantity).toFixed(2));
        total += subtotal;

        product.stock -= quantity;
        await productRepo.save(product);

        const orderDetail = orderDetailsRepo.create({
          product,
          quantity,
          subtotal,
        });

        orderDetailsToInsert.push(orderDetail);
      }

      const newOrder = orderRepo.create({
        user,
        total: Number(total.toFixed(2)),
      });

      const savedOrder = await orderRepo.save(newOrder);

      for (const detail of orderDetailsToInsert) {
        detail.order = savedOrder;
      }

      await orderDetailsRepo.save(orderDetailsToInsert);
      savedOrder.orderDetails = orderDetailsToInsert;

      return savedOrder;
    });
  }

  async delete(
    id: string,
    userIdFromToken: string,
    userRole: RolesEnum,
  ): Promise<string> {
    return this.transactionHelper.runInTransaction(async (queryRunner) => {
      const orderRepo = queryRunner.manager.getRepository(Order);
      const orderDetailsRepo = queryRunner.manager.getRepository(OrderDetails);

      const order = await orderRepo.findOne({
        where: { id: id },
        relations: ['user'],
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      if (
        order.user.id !== userIdFromToken &&
        userRole.includes(RolesEnum.USER)
      ) {
        throw new UnauthorizedException(
          'You cannot create an order for another user',
        );
      }

      if (order.orderDetails) {
        await orderDetailsRepo.delete({ order: { id } });
      }

      await orderRepo.delete(id);

      return id;
    });
  }
}
