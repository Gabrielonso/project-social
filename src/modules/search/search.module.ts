import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { User } from '../user/entity/user.entity';
import { Thought } from '../thought/entities/thought.entity';
import { FeedModule } from '../feeds/feed.module';
import { UserDisplayModule } from '../user/user-display.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Thought]),
    FeedModule,
    UserDisplayModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
