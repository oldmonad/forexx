import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import { RegisterDto, SigninDto, RefreshtokenDto } from './dto';
import {
  JwtConfig,
  Payload,
  accessTokenConfig,
  refreshTokenConfig,
} from './config';
import { RefreshToken, User, UserEntity } from '@app/global.guard';
import { QUEUE_INFO, MESSAGE_PATTERNS } from '@app/common';

@Injectable()
export class AuthenticationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,

    private readonly jwtService: JwtService,

    @Inject(QUEUE_INFO.walletServiceName)
    private readonly queueClient: ClientProxy,
  ) {}

  public async register(dto: RegisterDto): Promise<UserEntity> {
    try {
      const hash = await argon.hash(dto.password);
      const user = await this.userRepo.save({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        hash: hash,
      });

      this.queueClient.emit(MESSAGE_PATTERNS.walletMessagePattern, user.id);

      return new UserEntity(user);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new ForbiddenException(`Email ${dto.email} is already in use`);
      }

      throw error;
    }
  }

  public async signin(dto: SigninDto): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.userRepo.findOne({
      where: {
        email: dto.email,
      },
      select: {
        id: true,
        email: true,
        hash: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const passwordMatch = await argon.verify(user.hash, dto.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid password');

    const payload: Payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.generateJWT(payload, accessTokenConfig());
    const refreshToken = this.generateJWT(payload, refreshTokenConfig());

    const doc = await this.refreshTokenRepo.findOne({ where: { user } });

    if (doc) {
      await this.refreshTokenRepo.update({ user }, { token: refreshToken });

      return {
        accessToken: accessToken,
        refreshToken: refreshToken,
      };
    }

    await this.refreshTokenRepo.save({
      token: refreshToken,
      user,
    });

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  public async signout(user: UserEntity): Promise<void> {
    await this.refreshTokenRepo.delete({ user });
  }

  public generateJWT(payload: Payload, config: JwtConfig): string {
    return this.jwtService.sign(payload, {
      secret: config.secret,
      expiresIn: config.expiresIn,
    });
  }

  public async refreshToken(
    user: UserEntity,
    dto: RefreshtokenDto,
  ): Promise<{
    accessToken: string;
  }> {
    const refreshToken = await this.refreshTokenRepo.findOne({
      where: { token: dto.refreshToken },
    });

    if (!refreshToken) throw new UnauthorizedException();

    const payload: Payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.generateJWT(payload, accessTokenConfig());

    return {
      accessToken: accessToken,
    };
  }

  // public async getUser(dto: SigninDto): Promise<UserEntity> {
  //   const user = await this.userRepo.findOne({
  //     where: {
  //       email: dto.id,
  //     },
  //     select: {
  //       id: true,
  //       email: true,
  //       hash: true,
  //     },
  //   });

  //   if (!user) throw new NotFoundException('User not found');

  //   return user;
  // }
}
