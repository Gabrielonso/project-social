import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto, UpdateUserStatusDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UserQueryFilterDto } from './dto/user-query-filter.dto';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { VerifyUsernameDto } from './dto/verify-username.dto';
import { JwtOptionalGuard } from 'src/common/guards/jwt-optional.guard';
import { FollowsService } from '../engagements/services/follows.services';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private userService: UserService,
    private readonly followsService: FollowsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getUsers(@Query() userQueryDto: UserQueryFilterDto) {
    return this.userService.get(userQueryDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/deleted')
  getDeletedUsers() {
    return this.userService.getDeletedUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  store(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my user profile' })
  @Get('/profile')
  getMyUser(@Req() req) {
    const userId = req.user.id;
    return this.userService.getMyUserDetails(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Update my user data (firstName, lastName, username, bio, countryCode, profile picture, dob)',
  })
  @ApiOkResponse({
    description: 'User successfully updated',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: {
          type: 'string',
          example: 'Successfully updated user',
        },
      },
    },
  })
  // Body shape documented via UpdateUserDto properties
  @Patch('/profile')
  updateMyUser(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    const userId = req.user.id;
    return this.userService.update(updateUserDto, userId);
  }

  // @UseGuards(JwtAuthGuard)
  // @Patch('/:userId')
  // update(
  //   @Body() updateUserDto: UpdateUserDto,
  //   @Param('userId', new ParseUUIDPipe()) userId,
  // ) {
  //   return this.userService.update(updateUserDto, userId);
  // }

  @UseGuards(JwtOptionalGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user data' })
  @Get('/:userId')
  getUser(@Param('userId', new ParseUUIDPipe()) userId: string, @Req() req) {
    const authUserId = req.user.id;

    return this.userService.getUser(userId, authUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/:userId')
  deleteUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.userService.deleteUserAccount(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/:userId/restore')
  restore(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.userService.restoreUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/:userId/status')
  changeUserStatus(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() updateUserStatus: UpdateUserStatusDto,
  ) {
    return this.userService.updateUserStatus(updateUserStatus, userId);
  }

  @UseGuards(JwtOptionalGuard)
  @ApiBearerAuth()
  @Get('/:userId/followers')
  @ApiOperation({ summary: `Get a user's followers` })
  getUserFollowers(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Req() req,
  ) {
    const authUserId: string = req?.user?.id;

    return this.followsService.getUserFollowers(userId, authUserId);
  }

  @UseGuards(JwtOptionalGuard)
  @ApiBearerAuth()
  @Get('/:userId/following')
  @ApiOperation({ summary: `Get a user's following` })
  getUserFollowing(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Req() req,
  ) {
    const authUserId: string = req?.user?.id;
    return this.followsService.getUserFollowing(userId, authUserId);
  }

  @Get('/verify-username')
  @ApiOperation({ summary: 'Verify if a username is available' })
  @ApiQuery({
    name: 'username',
    required: true,
    description:
      'Username to verify. Allowed characters: letters, numbers, underscore. 3–30 characters.',
    example: 'john_doe',
  })
  @ApiOkResponse({
    description: 'Username availability result',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Operation successful' },
        data: {
          type: 'object',
          properties: {
            available: {
              type: 'boolean',
              example: true,
              description:
                'True if username is available, false if it is already taken',
            },
          },
        },
      },
    },
  })
  verifyUsername(@Query() query: VerifyUsernameDto) {
    return this.userService.verifyUsername(query.username);
  }
}
