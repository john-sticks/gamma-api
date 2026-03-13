import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  Notification,
  NotificationStatus,
} from '../entities/notification.entity';

@Injectable()
export class NotificationsRepository extends Repository<Notification> {
  constructor(private dataSource: DataSource) {
    super(Notification, dataSource.createEntityManager());
  }

  async countUnreadByRecipient(recipientId: string): Promise<number> {
    return this.count({
      where: { recipientId, status: NotificationStatus.UNREAD },
    });
  }
}
