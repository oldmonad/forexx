export const QUEUE_INFO = {
  notificationQueueName: 'notification_queue',
  notificationServiceName: 'notification_service',
  walletQueueName: 'wallet_queue',
  walletServiceName: 'wallet_service',
};

export const MESSAGE_PATTERNS = {
  notificationMessagePattern: 'notification.worker',
  walletMessagePattern: 'wallet.worker',
};

export enum Currency {
  NGN = 'NGN',
  USD = 'USD',
}

export const FETCH_RATE_QUEUE = 'fetch_rate_queue';
export const FETCH_RATE_QUEUE_PROCESSOR = 'fetch_rate_queue_processor';

export const CURRENCY_SET_KEY = 'currency_set';

export interface IExchangeRateResponse {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: Record<string, number>;
}
