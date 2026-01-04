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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

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
  @Patch('/:userId')
  update(
    @Body() updateUserDto: UpdateUserDto,
    @Param('userId', new ParseUUIDPipe()) userId,
  ) {
    return this.userService.update(updateUserDto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:userId')
  getUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.userService.getUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/:userId')
  deleteUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.userService.deleteUserAccount(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/:userId/restore')
  restore(@Param('userId', new ParseUUIDPipe()) userId) {
    return this.userService.restoreUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/:userId/status')
  changeUserStatus(
    @Param('userId', new ParseUUIDPipe()) userId,
    @Body() updateUserStatus: UpdateUserStatusDto,
  ) {
    return this.userService.updateUserStatus(updateUserStatus, userId);
  }
}
