import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ResponseUserDto } from '../users/dtos/response-user.dto';
import { SignInDto } from './dtos/signin.dto';
import { SignUpDto } from './dtos/signup.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid registration data' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async signUp(@Body() userData: SignUpDto): Promise<{
    message: string;
    data: ResponseUserDto;
  }> {
    const newUser = await this.authService.signUp(userData);
    return { message: 'User created successfully', data: newUser };
  }

  @Post('signin')
  @ApiOperation({ summary: 'Sign in and get JWT token' })
  @ApiResponse({
    status: 200,
    description:
      'Login successful - JWT Token included in response. Copy token to use in protected routes.',
  })
  @ApiResponse({ status: 400, description: 'Invalid credentials' })
  @ApiResponse({ status: 401, description: 'Incorrect email or password' })
  async signIn(@Body() credentials: SignInDto): Promise<{
    message: string;
    data: ResponseUserDto;
    token: string;
  }> {
    const validatedUser = await this.authService.signIn(credentials);
    return {
      message: 'User logged in successfully',
      data: validatedUser[0],
      token: validatedUser[1],
    };
  }
}
