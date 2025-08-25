import {
  Controller,
  Get,
  Res,
  UseGuards,
  Query,
  Req,
  Post,
  Body,
  Patch,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SignupUserDto } from './dto/signup-user.dto';
import { ResendEmailOtpDto, VerifyEmailDto } from './dto/user-verification.dto';
import { LoginUserDto } from './dto/login-user.dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/password-recovery.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/login')
  googleLogin() {}

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req, @Res() res: Response) {
    console.log(req.user, 'ueerr');
    await this.authService.handleGoogleCallback(req.user, res);
  }

  @Public()
  @Get('tiktok/login')
  tiktokOAuth(@Res() res: Response) {
    this.authService.handleTikTokLogin(res);
  }

  @Public()
  @Get('tiktok/callback')
  async tiktokCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const csrfState = (req.cookies as any)?.csrfState;

    if (state !== csrfState) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    try {
      const user = await this.authService.handleTikTokCallback(code);
      res.redirect(`http://localhost:5173?token=${user.token}`);
    } catch (error) {
      res.redirect(`http://localhost:5173?error=${error.message}`);
    }
  }

  @Post('/signup')
  @ApiOperation({ summary: 'Signup as a new user' })
  @ApiBody({ type: SignupUserDto })
  async signup(@Body() signUpUserDto: SignupUserDto) {
    return this.authService.signUp(signUpUserDto);
  }

  @Post('/verify-signup-email')
  @ApiOperation({ summary: `Verify signup email OTP` })
  @ApiBody({ type: VerifyEmailDto })
  async verifySignUpEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifySignUpEmailOtp(verifyEmailDto);
  }

  @Get('/resend-email-otp')
  @ApiOperation({ summary: `Resend email OTP` })
  @ApiBody({ type: ResendEmailOtpDto })
  @ApiQuery({ name: 'email', description: 'email of the user' })
  async resendEmailOtp(@Query() resendEmailDto: ResendEmailOtpDto) {
    return this.authService.resendVerifyOtp(resendEmailDto.email);
  }

  @Post('/login')
  @ApiOperation({ summary: `Login with email and password` })
  @ApiBody({ type: LoginUserDto })
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Post('/forgot-password')
  @ApiOperation({ summary: `Initiate forgot password request` })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('/reset-password')
  @ApiOperation({ summary: `Reset password with OTP` })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/change-password')
  @ApiOperation({ summary: `Change existing Password` })
  @ApiBody({ type: ChangePasswordDto })
  @ApiBearerAuth()
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req,
  ) {
    const userId = req.user.sub;
    return this.authService.changePassword(userId, changePasswordDto);
  }
}
