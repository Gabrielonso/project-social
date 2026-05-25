import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { successResponse } from 'src/common/helpers/response.helper';
import { UserDisplayService } from 'src/modules/user/user-display.service';
import { User } from 'src/modules/user/entity/user.entity';
import { CallSession } from '../entities/call-session.entity';
import { CallHistoryFilterDto } from '../dto/call-history-filter.dto';
import { CallSessionStatus } from '../enums/call-session-status.enum';
import { CallDirection } from '../enums/call-direction.enum';

const ACTIVE_STATUSES = [
  CallSessionStatus.RINGING,
  CallSessionStatus.CONNECTED,
];

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

@Injectable()
export class CallHistoryService {
  constructor(
    @InjectRepository(CallSession)
    private readonly callSessionRepo: Repository<CallSession>,
    private readonly userDisplayService: UserDisplayService,
  ) {}

  async getHistory(userId: string, filter: CallHistoryFilterDto) {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const qb = this.callSessionRepo
      .createQueryBuilder('session')
      .where(
        new Brackets((w) => {
          w.where('session.caller_id = :userId').orWhere(
            'session.callee_id = :userId',
          );
        }),
      )
      .setParameter('userId', userId);

    if (!filter.includeActive) {
      qb.andWhere('session.status NOT IN (:...activeStatuses)', {
        activeStatuses: ACTIVE_STATUSES,
      });
    }

    if (filter.type) {
      qb.andWhere('session.type = :type', { type: filter.type });
    }

    if (filter.status) {
      qb.andWhere('session.status = :status', { status: filter.status });
    }

    if (filter.direction === CallDirection.OUTGOING) {
      qb.andWhere('session.caller_id = :userId');
    } else if (filter.direction === CallDirection.INCOMING) {
      qb.andWhere('session.callee_id = :userId');
    }

    if (filter.chatId) {
      qb.andWhere('session.chat_id = :chatId', { chatId: filter.chatId });
    }

    if (filter.participantId) {
      qb.andWhere(
        new Brackets((w) => {
          w.where(
            'session.caller_id = :userId AND session.callee_id = :participantId',
          ).orWhere(
            'session.callee_id = :userId AND session.caller_id = :participantId',
          );
        }),
      ).setParameter('participantId', filter.participantId);
    }

    if (filter.from) {
      qb.andWhere('session.initiated_at >= :from', {
        from: new Date(filter.from),
      });
    }

    if (filter.to) {
      qb.andWhere('session.initiated_at <= :to', {
        to: new Date(filter.to),
      });
    }

    const search = filter.search?.trim();
    if (search) {
      qb.leftJoin(User, 'caller', 'caller.id = session.caller_id')
        .leftJoin(User, 'callee', 'callee.id = session.callee_id')
        .andWhere(
          new Brackets((w) => {
            w.where(
              'session.caller_id = :userId AND (callee.username ILIKE :search OR callee.first_name ILIKE :search OR callee.last_name ILIKE :search)',
            )
              .orWhere(
                'session.callee_id = :userId AND (caller.username ILIKE :search OR caller.first_name ILIKE :search OR caller.last_name ILIKE :search)',
              )
              .orWhere('session.call_uuid ILIKE :search');
          }),
        )
        .setParameter('search', `%${search}%`);
    }

    const countQb = qb.clone();
    const total = await countQb.getCount();

    const sessions = await qb
      .orderBy('session.initiated_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    const otherUserIds = sessions.map((s) =>
      s.callerId === userId ? s.calleeId : s.callerId,
    );
    const displayMap = await this.userDisplayService.getByIds(otherUserIds);

    const data = sessions.map((session) => {
      const isOutgoing = session.callerId === userId;
      const otherUserId = isOutgoing ? session.calleeId : session.callerId;
      const display = displayMap.get(otherUserId);

      return {
        id: session.id,
        callUuid: session.callUuid,
        chatId: session.chatId,
        type: session.type,
        status: session.status,
        direction: isOutgoing
          ? CallDirection.OUTGOING
          : CallDirection.INCOMING,
        initiatedAt: session.initiatedAt,
        answeredAt: session.answeredAt,
        endedAt: session.endedAt,
        durationSeconds: session.durationSeconds,
        durationFinal: session.durationFinal,
        chatMessageId: session.chatMessageId,
        otherParticipant: {
          id: otherUserId,
          username: display?.username ?? null,
          profilePicture: display?.profilePicture ?? null,
        },
      };
    });

    return successResponse('Operation Successful', {
      data,
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      total,
      limit,
    });
  }
}
