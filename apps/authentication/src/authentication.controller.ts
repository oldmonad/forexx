import {
  Controller,
  Get,
  Post,
  Delete,
  ClassSerializerInterceptor,
  UseInterceptors,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { RegisterDto, SigninDto } from './dto';
import { AccessGuard } from './guard';
import { SerializeUser, UserEntity } from '@app/global.guard';

@Controller()
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<UserEntity> {
    return this.authenticationService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  signin(@Body() dto: SigninDto): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    return this.authenticationService.signin(dto);
  }

  @UseGuards(AccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('signout')
  signout(@SerializeUser() user: UserEntity): Promise<void> {
    return this.authenticationService.signout(user);
  }

  @UseGuards(AccessGuard)
  @HttpCode(HttpStatus.OK)
  @Get('profile')
  user(@SerializeUser() user: UserEntity): UserEntity {
    return user;
  }

  // @UseGuards(RefreshGuard)
  // @HttpCode(HttpStatus.OK)
  // @Post('refresh')
  // refreshToken(
  //   @SerializeUser() user: UserEntity,
  //   @Body() dto: RefreshtokenDto,
  // ): Promise<{
  //   access_token: string;
  // }> {
  //   return this.userService.refreshToken(user, dto);
  // }
}
