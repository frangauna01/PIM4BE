import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { OrderDetails } from './entities/order-details.entity';

@Injectable()
export class OrderDetailsService {
  async save(
    order: Order,
    products: Product[],
    quantities: Record<string, number>,
    queryRunner: QueryRunner,
  ): Promise<OrderDetails[]> {
    const orderDetailsRepo = queryRunner.manager.getRepository(OrderDetails);

    const orderDetails = products.map((product) =>
      orderDetailsRepo.create({
        order,
        product,
        quantity: quantities[product.id],
        subtotal: Number(
          (Number(product.price) * quantities[product.id]).toFixed(2),
        ),
      }),
    );

    await orderDetailsRepo.save(orderDetails);

    return orderDetails;
  }
}
