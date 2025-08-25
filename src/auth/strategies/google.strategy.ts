import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { Inject, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import googleOauthConfig from '../config/google-oauth.config';
import { ConfigType } from '@nestjs/config';
import { UserCreateOptions } from 'src/user/interfaces/user.interfaces';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private authService: AuthService,
    @Inject(googleOauthConfig.KEY)
    private googleConfiguration: ConfigType<typeof googleOauthConfig>,
  ) {
    super({
      clientID: googleConfiguration.clientID!,
      clientSecret: googleConfiguration.clientSecret!,
      callbackURL: googleConfiguration.callbackURL!,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value ?? '';
    const firstName = profile.name?.givenName ?? '';
    const lastName = profile.name?.familyName ?? '';
    const profilePic = profile.photos?.[0]?.value ?? '';

    const user = await this.authService.validateGoogleUser({
      email,
      firstName: firstName,
      lastName: lastName,
      password: '',
      createOption: UserCreateOptions.GOOGLE,
      profilePicture: profilePic,
    });
    done(null, user as any);
  }
}
