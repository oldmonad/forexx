import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async sendEmail(userId: string) {
    this.logger.log('Execute long running task >> ', userId);
    this.logger.debug(userId);
    await this.sleep(2000);

    // Fetch user from auth service and send email
    this.logger.log(`Email sent to user with id ${userId}`);
  }

  async sleep(timeInMs: number = 500) {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve({}), timeInMs);
    });
  }
}
