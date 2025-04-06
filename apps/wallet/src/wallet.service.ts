import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { QueryFailedError, Repository, EntityManager } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Wallet, WalletEntity } from './entity';
import { UpdateWalletDto, BalanceUpdateType, ListWalletDto } from './dto';
import {
  Currency,
  GetWalletRequestByCurrency,
  GRPCCurrency,
  // Wallet as GWallet,
  // WALLET,
} from '@app/common';

@Injectable()
export class WalletService {
  @InjectRepository(Wallet)
  private readonly walletRepo: Repository<Wallet>;
  private readonly logger = new Logger(WalletService.name);

  public async createWallets(userId: string): Promise<void> {
    try {
      await this.walletRepo.manager.transaction(
        async (transactionalEntityManager: EntityManager) => {
          // Create USD wallet
          const usdWallet = transactionalEntityManager.create(Wallet, {
            userId: userId,
            currency: Currency.USD,
          });
          await transactionalEntityManager.save(usdWallet);

          // Create NGN wallet
          const ngnWallet = transactionalEntityManager.create(Wallet, {
            userId: userId,
            currency: Currency.NGN,
          });
          await transactionalEntityManager.save(ngnWallet);
        },
      );

      this.logger.log('Wallets created');
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new ForbiddenException(
          'somthing went wrong while creating a wallet',
        );
      }

      throw error;
    }
  }

  public async updateWalletBalance(
    dto: UpdateWalletDto,
  ): Promise<WalletEntity> {
    try {
      const wallet = await this.walletRepo.findOne({
        where: {
          id: dto.walletId,
          userId: dto.userId,
        },
        select: {
          id: true,
          balance: true,
          currency: true,
          userId: true,
        },
      });

      if (!wallet) throw new NotFoundException('Wallet not found');

      if (wallet.userId !== dto.userId)
        throw new ForbiddenException(
          'You are not authorized to update this wallet',
        );

      if (dto.updateType === BalanceUpdateType.INCREMENT) {
        await this.walletRepo.increment(
          { id: dto.walletId },
          'balance',
          dto.amount,
        );
      } else {
        await this.walletRepo.decrement(
          { id: dto.walletId },
          'balance',
          dto.amount,
        );
      }

      const updatedWallet = await this.walletRepo.findOne({
        where: {
          id: dto.walletId,
        },
        select: {
          id: true,
          balance: true,
          currency: true,
        },
      });

      if (!updatedWallet) {
        throw new NotFoundException('Wallet not found after update');
      }

      return new WalletEntity(updatedWallet);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new ForbiddenException(
          'somthing went wrong while creating a wallet',
        );
      }

      throw error;
    }
  }

  public async listWallets(dto: ListWalletDto): Promise<WalletEntity[]> {
    try {
      const wallets = await this.walletRepo.find({
        where: { userId: dto.userId },
        order: { createdAt: 'DESC' },
      });

      return wallets;
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new ForbiddenException(
          'somthing went wrong while creating a wallet',
        );
      }

      throw error;
    }
  }

  public async getWalletByCurrency(data: GetWalletRequestByCurrency) {
    try {
      const wallet = await this.walletRepo.findOne({
        where: {
          userId: data.userId,
          currency:
            data.currency === GRPCCurrency.USD ? Currency.USD : Currency.NGN,
        },
      });

      if (!wallet) throw new NotFoundException('Wallet not found');

      return {
        ...wallet,
        currency: this.mapCurrency(wallet.currency),
      };
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new ForbiddenException(
          'somthing went wrong while creating a wallet',
        );
      }

      throw error;
    }
  }

  private mapCurrency(currency: Currency): GRPCCurrency {
    return currency as unknown as GRPCCurrency;
  }
}
