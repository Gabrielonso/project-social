import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import googleOauthConfig from '../../config/google-oauth.config';
import tiktokOauthConfig from '../../config/tiktok-oauth.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/modules/user/entity/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from 'src/modules/user/user.service';
import { LocalStrategy } from 'src/common/strategies/local.strategy';
import { GoogleStrategy } from 'src/common/strategies/google.strategy';
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';
import { AccountActivityModule } from '../account-activity/account-activity.module';

@Module({
  providers: [
    AuthService,
    LocalStrategy,
    GoogleStrategy,
    JwtStrategy,
    UserService,
  ],
  controllers: [AuthController],
  imports: [
    ConfigModule.forFeature(googleOauthConfig),
    ConfigModule.forFeature(tiktokOauthConfig),
    TypeOrmModule.forFeature([User]),
    JwtModule.register({}),
    AccountActivityModule,
  ],
})
export class AuthModule {}
