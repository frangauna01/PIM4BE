import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ProductsModule } from './modules/products/products.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { DatabaseModule } from './modules/database/database.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SeederModule } from './modules/seeder/seeder.module';
import { OrderDetailsModule } from './modules/order-details/order-details.module';
import { UtilsModule } from './modules/utils/utils.module';
import { FilesModule } from './modules/files/files.module';

@Module({
  imports: [
    DatabaseModule,
    SeederModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    FilesModule,
    OrdersModule,
    OrderDetailsModule,
    UtilsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
