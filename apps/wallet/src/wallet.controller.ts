import {
  Controller,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GrpcMethod, MessagePattern } from '@nestjs/microservices';
import { WalletService } from './wallet.service';
import {
  GlobalGuardService,
  UserEntity,
  SerializeUser,
} from '@app/global.guard';
import {
  WALLET_SERVICE_NAME,
  GetWalletRequestByCurrency,
  UpdateWalletRequest,
  MESSAGE_PATTERNS,
  UpdateType,
} from '@app/common';
import { WalletEntity } from './entity';
import { BalanceUpdateType } from './dto';

@Controller()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @MessagePattern(MESSAGE_PATTERNS.walletMessagePattern)
  async createWallets(userId: string) {
    await this.walletService.createWallets(userId);
  }

  @UseGuards(GlobalGuardService)
  @GrpcMethod(WALLET_SERVICE_NAME, 'GetWalletByCurrency')
  getWalletByCurrency(data: GetWalletRequestByCurrency) {
    return this.walletService.getWalletByCurrency(data);
  }

  @UseGuards(GlobalGuardService)
  @GrpcMethod(WALLET_SERVICE_NAME, 'UpdateWallet')
  async updateWalletBalance(data: UpdateWalletRequest): Promise<WalletEntity> {
    return this.walletService.updateWalletBalance({
      walletId: data.walletId,
      userId: data.userId,
      updateType:
        data.updateType === UpdateType.DEPOSIT
          ? BalanceUpdateType.INCREMENT
          : BalanceUpdateType.DECREMENT,
      amount: data.amount,
    });
  }

  @UseGuards(GlobalGuardService)
  @HttpCode(HttpStatus.OK)
  @Get('wallets')
  async listWallets(
    @SerializeUser() user: UserEntity,
  ): Promise<WalletEntity[]> {
    return this.walletService.listWallets({ userId: user.id });
  }
}
