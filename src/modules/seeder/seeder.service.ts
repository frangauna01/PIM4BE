import { InjectRepository } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import DataProducts from '../../assets/data-products.json';
import { User } from '../users/entities/user.entity';
import bcrypt from 'bcryptjs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Order } from '../orders/entities/order.entity';
import { OrderDetails } from '../order-details/entities/order-details.entity';
import { CreateProductDto } from '../products/dtos/create-product.dto';

@Injectable()
export class SeederService {
  data = DataProducts as CreateProductDto[];
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderDetails)
    private readonly orderDetailsRepository: Repository<OrderDetails>,
  ) {}

  async entityExists<T extends ObjectLiteral>(
    repo: Repository<T>,
    where: FindOptionsWhere<T>,
  ): Promise<boolean> {
    const found = await repo.findOne({ where });
    return !!found;
  }

  async seedCategories() {
    const categoriesNames = new Set(this.data.map((p) => p.category));
    const categoriesArray = Array.from(categoriesNames);
    const categories = categoriesArray.map((c) => ({ name: c }));

    await this.categoriesRepository.upsert(categories, ['name']);
    console.log('✅ Categories seeded successfully');
  }

  async seedProducts() {
    const products = this.data.map(async (product) => {
      const category = await this.categoriesRepository.findOne({
        where: { name: product.category },
      });

      if (!category) {
        throw new NotFoundException(
          `⚠️ Category ${product.category} not found`,
        );
      }

      const productToInsert = this.productsRepository.create({
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        imgUrl: product.imgUrl,
        category,
      });

      return await this.productsRepository.upsert(productToInsert, ['name']);
    });

    await Promise.all(products);
    console.log('✅ Products seeded successfully');
  }

  async seedUsers() {
    const hashPassword = (pass: string) => bcrypt.hash(pass, 10);

    const usersData = [
      {
        email: 'francorgauna@gmail.com',
        name: 'Fran Gauna',
        password: await hashPassword('Pass123!'),
        address: 'Pasaje Fazio 1477',
        phone: 2226482075,
        country: 'Argentina',
        city: 'San Miguel del Monte',
        isAdmin: true,
      },
      {
        email: 'jigauna59@gmail.com',
        name: 'Jose Gauna',
        password: await hashPassword('Pass123!'),
        address: 'Pasaje Fazio 1477',
        phone: 2226540978,
        country: 'Argentina',
        city: 'San Miguel del Monte',
      },
    ];

    await this.usersRepository.upsert(usersData, ['email']);
    console.log('✅ Users seeded successfully');
  }

  async seedOrders() {
    const user = await this.usersRepository.findOne({
      where: { email: 'francorgauna@gmail.com' },
    });

    if (!user) throw new Error('User not found');

    const existingOrder = await this.ordersRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user'],
    });

    if (existingOrder) {
      console.log('✅ Order for user already exists. Skipping seeding.');
      return;
    }

    const allProducts = await this.productsRepository.find();
    const selectedProducts = allProducts.slice(0, 2);

    const productQuantities = {
      [selectedProducts[0].id]: 2,
      [selectedProducts[1].id]: 5,
    };

    const total = selectedProducts.reduce((acc, product) => {
      const quantity = productQuantities[product.id];
      return acc + Number((Number(product.price) * quantity).toFixed(2));
    }, 0);

    const newOrder = this.ordersRepository.create({
      user,
      total: Number(total.toFixed(2)),
    });

    const savedOrder = await this.ordersRepository.save(newOrder);

    const orderDetailsToInsert = selectedProducts.map((product) =>
      this.orderDetailsRepository.create({
        order: savedOrder,
        product,
        quantity: productQuantities[product.id],
        subtotal: Number(
          (Number(product.price) * productQuantities[product.id]).toFixed(2),
        ),
      }),
    );

    await this.orderDetailsRepository.save(orderDetailsToInsert);

    console.log('✅ Order and OrderDetails seeded correctly');
  }
}
