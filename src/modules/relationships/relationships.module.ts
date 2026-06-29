import { Module } from '@nestjs/common';
import { RelationshipsController } from './relationships.controller';
import { EngagementsModule } from '../engagements/engagements.module';

@Module({
  imports: [EngagementsModule],
  controllers: [RelationshipsController],
})
export class RelationshipsModule {}
