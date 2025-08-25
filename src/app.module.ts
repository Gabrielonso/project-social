import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ormConfig } from './config/orm-config';
import { SeederModule } from './seeder/seeder.module';
import { OpportunityModule } from './opportunity/opportunity.module';
import { SubmissionModule } from './submission/submission.module';
import { SkillsModule } from './skills/skills.module';

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
    OpportunityModule,
    SubmissionModule,
    SkillsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
