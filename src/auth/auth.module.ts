import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import googleOauthConfig from './config/google-oauth.config';
import tiktokOauthConfig from './config/tiktok-oauth.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entity/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserService } from 'src/user/user.service';

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
  ],
})
export class AuthModule {}
