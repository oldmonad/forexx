import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Request } from 'express';
import { Metadata } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GlobalGuardService implements CanActivate {
  private readonly authServiceurl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.authServiceurl =
      this.configService.getOrThrow<string>('AUTH_SERVICE_URL');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let authHeader: string | undefined;
    let userHolder: any;

    const ctxType = context.getType();

    if (ctxType === 'rpc') {
      // In gRPC the context contains the metadata
      const metadata: Metadata = context.switchToRpc().getContext();
      const authArray = metadata.get('authorization');
      authHeader = Array.isArray(authArray)
        ? (authArray[0] as string)
        : undefined;
      userHolder = metadata;
    } else {
      const request = context.switchToHttp().getRequest<Request>();
      authHeader = request.headers['authorization'];
      userHolder = request;
    }

    if (ctxType === 'rpc' && !authHeader) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'Unauthenticated',
      });
    }

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization header format');
    }

    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.authServiceurl}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );

      if (response.data && response.data.isActive) {
        userHolder.user = response.data;
        return true;
      }
      throw new UnauthorizedException('Invalid token');
    } catch (error) {
      if (error instanceof Error) {
        throw new UnauthorizedException(error.message);
      } else {
        throw new UnauthorizedException('An unauthorized error occurred');
      }
    }
  }
}
