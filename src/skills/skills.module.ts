import { Module } from '@nestjs/common';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from './entity/skill.entity';

@Module({
  controllers: [SkillsController],
  providers: [SkillsService],
  imports: [TypeOrmModule.forFeature([Skill])],
})
export class SkillsModule {}
