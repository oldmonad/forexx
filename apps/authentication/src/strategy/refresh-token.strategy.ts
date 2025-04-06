import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Payload } from '../config';
import { User } from '@app/global.guard';
import { Repository } from 'typeorm';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh-jwt',
) {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    public readonly config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: config.getOrThrow<string>('AUTH_REFRESH_TOKEN_SECRET'),
      ignoreExpiration: false,
    });
  }
  async validate(payload: Payload) {
    return this.userRepo.findOne({
      where: {
        id: payload.sub,
      },
    });
  }
}
