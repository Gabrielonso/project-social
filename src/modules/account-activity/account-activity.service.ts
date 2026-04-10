import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { successResponse } from 'src/common/helpers/response.helper';
import { AccountActivity } from './entities/account-activity.entity';

type LogActivityParams = {
  userId: string;
  action: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AccountActivityService {
  constructor(
    @InjectRepository(AccountActivity)
    private readonly activityRepo: Repository<AccountActivity>,
  ) {}

  async log(params: LogActivityParams) {
    const activity = this.activityRepo.create({
      userId: params.userId,
      action: params.action,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    await this.activityRepo.save(activity);
  }

  async getMyActivities(userId: string, page = 1, limit = 20) {
    const safePage = Number(page) || 1;
    const safeLimit = Number(limit) || 20;
    const offset = (safePage - 1) * safeLimit;

    const [data, total] = await this.activityRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: safeLimit,
    });

    return successResponse('Operation Successful', {
      data,
      currentPage: safePage,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    });
  }
}
