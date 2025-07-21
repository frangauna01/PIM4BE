import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHelper } from '../utils/helpers/transaction.helper';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ResponseUserDto } from './dtos/response-user.dto';
import { RolesEnum } from '../auth/decorators/roles.decorator';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly transactionHelper: TransactionHelper,
  ) {}

  async findAll(page: number, limit: number): Promise<ResponseUserDto[]> {
    const [users, total] = await this.usersRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      relations: ['orders'],
    });

    if (!total) throw new NotFoundException('There are currently no users');

    const totalPages = Math.ceil(total / limit);

    if (page > totalPages && total > 0) {
      throw new BadRequestException(
        `The requested page (${page}) exceeds the maximum (${totalPages})`,
      );
    }

    return users.map((user) => {
      const { password: _password, ...rest } = user;
      return rest;
    });
  }

  async findById(id: string): Promise<ResponseUserDto> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['orders.orderDetails'],
    });

    if (!user) {
      throw new NotFoundException(`User with UUID ${id} not found`);
    }

    return user;
  }

  async update(
    id: string,
    userData: UpdateUserDto,
    userIdFromToken: string,
    userRole: RolesEnum,
  ): Promise<string> {
    return this.transactionHelper.runInTransaction(async (queryRunner) => {
      const userRepo = queryRunner.manager.getRepository(User);

      const user = await userRepo.findOneBy({ id });
      if (!user) {
        throw new NotFoundException(`User with UUID ${id} not found`);
      }

      if (userRole === RolesEnum.USER && userIdFromToken !== id) {
        throw new UnauthorizedException('You cannot update another user');
      }

      if (
        userRole === RolesEnum.USER &&
        'isAdmin' in userData &&
        userData.isAdmin !== user.isAdmin
      ) {
        throw new UnauthorizedException('You cannot change your admin status');
      }

      const updatedUser = {
        ...user,
        ...userData,
      };

      await userRepo.save(updatedUser);

      return updatedUser.id;
    });
  }

  async delete(
    id: string,
    userIdFromToken: string,
    userRole: RolesEnum,
  ): Promise<string> {
    return this.transactionHelper.runInTransaction(async (queryRunner) => {
      const userRepo = queryRunner.manager.getRepository(User);

      const user = await userRepo.findOneBy({ id });
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      if (userRole === RolesEnum.USER && userIdFromToken !== id) {
        throw new UnauthorizedException('You cannot delete another user');
      }

      await userRepo.delete(id);
      return user.id;
    });
  }
}
