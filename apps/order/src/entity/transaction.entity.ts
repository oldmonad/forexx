import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Order } from './order.entity';

@Entity()
@Unique('UQ_order_user', ['order', 'userId'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.transactions)
  @JoinColumn() // Optional, based on your schema design
  order: Order;

  @Column()
  userId: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 10, scale: 4 })
  exchangeRate: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalCost: number;

  @Column({ default: 'pending' })
  status: 'pending' | 'completed' | 'failed' | 'cancelled';

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}

export class TransactionEntity {
  id: string;
  order: Order;
  userId: string;
  orderId: string;
  amount: number;
  exchangeRate: number;
  totalCost: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<TransactionEntity>) {
    Object.assign(this, partial);
  }
}
