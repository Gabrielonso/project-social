import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ormConfig } from './config/orm-config';
import { SeederModule } from './database/seeder/seeder.module';
import { PostModule } from './modules/posts/post.module';
import { StoryModule } from './modules/stories/story.module';
import { AdminModule } from './modules/admin/admin.module';
import { MediaModule } from './modules/media/media.module';
import { FeedModule } from './modules/feeds/feed.module';
import { AdModule } from './modules/ads/ad.module';
import { EngagementsModule } from './modules/engagements/engagements.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: () => ormConfig,
    }),
    SeederModule,
    AuthModule,
    UserModule,
    PostModule,
    StoryModule,
    AdminModule,
    MediaModule,
    FeedModule,
    AdModule,
    EngagementsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
