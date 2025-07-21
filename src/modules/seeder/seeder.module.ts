import { Module, OnModuleInit } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderDetails } from '../order-details/entities/order-details.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Product, Category, Order, OrderDetails]),
  ],
  providers: [SeederService],
})
export class SeederModule implements OnModuleInit {
  constructor(private readonly seederService: SeederService) {}

  async onModuleInit() {
    await this.seederService.seedCategories();
    await this.seederService.seedProducts();
    await this.seederService.seedUsers();
    await this.seederService.seedOrders();
  }
}
