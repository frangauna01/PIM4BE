import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { SignInDto } from './dtos/signin.dto';
import { SignUpDto } from './dtos/signup.dto';
import { TransactionHelper } from '../utils/helpers/transaction.helper';
import { JwtService } from '@nestjs/jwt';
import { ResponseUserDto } from '../users/dtos/response-user.dto';
import { RolesEnum } from './decorators/roles.decorator';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly transactionHelper: TransactionHelper,
    private readonly jwtService: JwtService,
  ) {}

  async signUp(userData: SignUpDto): Promise<ResponseUserDto> {
    return this.transactionHelper.runInTransaction(async (queryRunner) => {
      const userRepo = queryRunner.manager.getRepository(User);
      const { email, phone } = userData;

      const existingUser = await userRepo.findOne({
        where: [{ email }, { phone }],
      });

      if (existingUser) {
        throw new ConflictException(
          'User with this email or phone number already exists',
        );
      }

      if (userData.password !== userData.confirmPassword)
        throw new BadRequestException('Password confirmation does not match');

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const newUser = userRepo.create({
        ...userData,
        password: hashedPassword,
      });

      await userRepo.save(newUser);

      return newUser;
    });
  }

  async signIn(credentials: SignInDto): Promise<[ResponseUserDto, string]> {
    const { email, password } = credentials;

    const foundUser = await this.usersRepository.findOne({
      where: { email },
    });

    if (!foundUser || !(await bcrypt.compare(password, foundUser.password))) {
      throw new BadRequestException('Email or password incorrect');
    }

    const payload = {
      id: foundUser.id,
      email: foundUser.email,
      role: foundUser.isAdmin ? RolesEnum.ADMIN : RolesEnum.USER,
    };

    const token = this.jwtService.sign(payload);

    return [foundUser, token];
  }
}
