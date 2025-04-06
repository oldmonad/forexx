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
