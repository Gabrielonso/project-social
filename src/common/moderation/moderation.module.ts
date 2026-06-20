import { Module } from '@nestjs/common';
import { ModerationPolicyService } from './moderation-policy.service';
import { MediaModerationService } from './media-moderation.service';

@Module({
  providers: [ModerationPolicyService, MediaModerationService],
  exports: [ModerationPolicyService, MediaModerationService],
})
export class ModerationModule {}
