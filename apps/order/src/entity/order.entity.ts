import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { Currency } from '@app/common';

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  orderType: 'buy' | 'sell';

  @Column({ type: 'enum', enum: Currency })
  baseCurrency: Currency;

  @Column({ type: 'enum', enum: Currency })
  quoteCurrency: Currency;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalCost: number;

  @Column({ default: 'pending' })
  status: 'pending' | 'completed' | 'failed' | 'cancelled';

  @OneToMany(() => Transaction, (transaction) => transaction.order, {
    cascade: true,
  })
  transactions: Transaction[];

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}

export class OrderEntity {
  id: string;
  userId: string;
  orderType: 'buy' | 'sell';
  baseCurrency: string;
  quoteCurrency: string;
  amount: number;
  exchangeRate: number;
  totalCost: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transaction: Transaction;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<OrderEntity>) {
    Object.assign(this, partial);
  }
}
