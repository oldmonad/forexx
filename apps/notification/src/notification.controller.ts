import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

import { NotificationService } from './notification.service';
import { MESSAGE_PATTERNS } from '@app/common';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @MessagePattern(MESSAGE_PATTERNS.notificationMessagePattern)
  async consumeBrokerMessage(userId: string) {
    await this.notificationService.sendEmail(userId);
  }
}
