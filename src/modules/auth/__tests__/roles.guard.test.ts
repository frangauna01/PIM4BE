/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../guards/roles.guard';
import { RolesEnum } from '../decorators/roles.decorator';
import { IJwtPayload } from '../interfaces/token.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockRequest = {
    user: null as unknown,
  };

  const mockHttpArgumentsHost = {
    getRequest: jest.fn(() => mockRequest),
  };

  const mockExecutionContext = {
    switchToHttp: jest.fn(() => mockHttpArgumentsHost),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true when no required roles are defined', () => {
    // Arrange
    const mockUser: IJwtPayload = {
      id: '1',
      email: 'test@example.com',
      role: RolesEnum.USER,
      exp: '1234567890',
      iat: '1234567890',
    };

    mockRequest.user = mockUser;
    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    // Act
    const result = guard.canActivate(mockExecutionContext);

    // Assert
    expect(result).toBe(true);
  });

  it('should return true when user has required admin role', () => {
    // Arrange
    const mockUser: IJwtPayload = {
      id: '1',
      email: 'admin@example.com',
      role: RolesEnum.ADMIN,
      exp: '1234567890',
      iat: '1234567890',
    };

    mockRequest.user = mockUser;
    mockReflector.getAllAndOverride.mockReturnValue([RolesEnum.ADMIN]);

    // Act
    const result = guard.canActivate(mockExecutionContext);

    // Assert
    expect(result).toBe(true);
  });

  it('should return true when user has required user role', () => {
    // Arrange
    const mockUser: IJwtPayload = {
      id: '1',
      email: 'user@example.com',
      role: RolesEnum.USER,
      exp: '1234567890',
      iat: '1234567890',
    };

    mockRequest.user = mockUser;
    mockReflector.getAllAndOverride.mockReturnValue([RolesEnum.USER]);

    // Act
    const result = guard.canActivate(mockExecutionContext);

    // Assert
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when user does not have required role', () => {
    // Arrange
    const mockUser: IJwtPayload = {
      id: '1',
      email: 'user@example.com',
      role: RolesEnum.USER,
      exp: '1234567890',
      iat: '1234567890',
    };

    mockRequest.user = mockUser;
    mockReflector.getAllAndOverride.mockReturnValue([RolesEnum.ADMIN]);

    // Act & Assert
    expect(() => guard.canActivate(mockExecutionContext)).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(mockExecutionContext)).toThrow(
      "You don't have permission to access this route",
    );
  });

  it('should throw ForbiddenException when user is null', () => {
    // Arrange
    mockRequest.user = null;
    mockReflector.getAllAndOverride.mockReturnValue([RolesEnum.ADMIN]);

    // Act & Assert
    expect(() => guard.canActivate(mockExecutionContext)).toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException when user role is null', () => {
    // Arrange
    const mockUser = {
      id: '1',
      email: 'user@example.com',
      role: null,
      exp: '1234567890',
      iat: '1234567890',
    };

    mockRequest.user = mockUser;
    mockReflector.getAllAndOverride.mockReturnValue([RolesEnum.ADMIN]);

    // Act & Assert
    expect(() => guard.canActivate(mockExecutionContext)).toThrow(
      ForbiddenException,
    );
  });

  it('should call reflector.getAllAndOverride with correct parameters', async () => {
    // Arrange
    const mockUser: IJwtPayload = {
      id: '1',
      email: 'user@example.com',
      role: RolesEnum.USER,
      exp: '1234567890',
      iat: '1234567890',
    };

    mockRequest.user = mockUser;
    mockReflector.getAllAndOverride.mockReturnValue([RolesEnum.USER]);

    // Act
    await guard.canActivate(mockExecutionContext);

    // Assert
    expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
      mockExecutionContext.getHandler(),
      mockExecutionContext.getClass(),
    ]);
  });
});
