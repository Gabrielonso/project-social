import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FollowsService } from '../engagements/services/follows.services';
import { BlocksService } from '../engagements/services/blocks.services';

@ApiTags('Relationships')
@ApiBearerAuth()
@Controller('relationships')
@UseGuards(JwtAuthGuard)
export class RelationshipsController {
  constructor(
    private readonly followsService: FollowsService,
    private readonly blocksService: BlocksService,
  ) {}

  @Post('follows/:userId')
  @ApiOperation({ summary: 'Follow a user' })
  @ApiParam({
    description: 'User ID to follow',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
    name: 'userId',
  })
  followUser(@Req() req, @Param('userId', ParseUUIDPipe) targetUserId: string) {
    const userId: string = req.user.id;
    return this.followsService.followUser(userId, targetUserId);
  }

  @Delete('follows/:userId')
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiParam({
    description: 'User ID to unfollow',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
    name: 'userId',
  })
  unfollowUser(
    @Req() req,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    const userId: string = req.user.id;
    return this.followsService.unfollowUser(userId, targetUserId);
  }

  @Get('followers')
  @ApiOperation({ summary: 'Get my followers' })
  getFollowers(@Req() req) {
    const userId: string = req.user.id;
    return this.followsService.getFollowers(userId);
  }

  @Get('following')
  @ApiOperation({ summary: 'Get users I am following' })
  getFollowing(@Req() req) {
    const userId: string = req.user.id;
    return this.followsService.getFollowing(userId);
  }

  @Get('friends')
  @ApiOperation({
    summary: 'Get my friends (users I follow who also follow me back)',
  })
  getFriends(@Req() req) {
    const userId: string = req.user.id;
    return this.followsService.getFriends(userId);
  }

  @Get('blocks')
  @ApiOperation({ summary: 'Get blocked users' })
  getBlockedUsers(@Req() req) {
    const userId: string = req.user.id;
    return this.blocksService.getBlockedUsers(userId);
  }

  @Post('blocks/:userId')
  @ApiOperation({ summary: 'Block a user' })
  @ApiParam({
    description: 'User ID to block',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
    name: 'userId',
  })
  blockUser(@Req() req, @Param('userId', ParseUUIDPipe) targetUserId: string) {
    const userId: string = req.user.id;
    return this.blocksService.blockUser(userId, targetUserId);
  }

  @Delete('blocks/:userId')
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiParam({
    description: 'User ID to unblock',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
    name: 'userId',
  })
  unBlockUser(
    @Req() req,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    const userId: string = req.user.id;
    return this.blocksService.unBlockUser(userId, targetUserId);
  }
}
