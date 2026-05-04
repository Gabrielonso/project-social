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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatsService } from './chats.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ChatsFilterDto } from './dtos/chats-filter.dto';
import { ChatMessagesFilterDto } from './dtos/chat-messages-filter.dto';
import { CreateGroupChatDto } from './dtos/create-group-chat.dto';
import { EditGroupChatDto } from './dtos/edit-group-chat.dto ';
import { AddChatMembersDto } from './dtos/add-chat-members.dto ';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('')
  @ApiOperation({ summary: 'Get My Chats' })
  async getMyChats(@Req() req, @Query() chatsFilterDto: ChatsFilterDto) {
    const userId: string = req.user.id;
    return this.chatService.getMyChats(userId, chatsFilterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('messages')
  @ApiOperation({ summary: 'Get chat messages' })
  async getChatMessages(
    @Req() req,
    @Query() chatMessagesFilterDto: ChatMessagesFilterDto,
  ) {
    const userId: string = req.user.id;
    return this.chatService.getChatMessages(userId, chatMessagesFilterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('group')
  @ApiOperation({ summary: 'Create group chat' })
  @ApiBody({ type: CreateGroupChatDto })
  async createGroupChat(
    @Req() req,
    @Body() createGroupChatDto: CreateGroupChatDto,
  ) {
    const userId: string = req.user.id;
    return this.chatService.createGroupChat(createGroupChatDto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':chatId')
  @ApiOperation({ summary: 'Edit group chat info' })
  @ApiBody({ type: EditGroupChatDto })
  async EditGroupChat(
    @Req() req,
    @Body() editGroupChatDto: EditGroupChatDto,
    @Param('chatId', ParseUUIDPipe) chatId: string,
  ) {
    const userId: string = req.user.id;
    return this.chatService.editGroupChatInfo(chatId, editGroupChatDto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':chatId/members')
  @ApiOperation({ summary: 'Add members to group chat' })
  @ApiBody({ type: AddChatMembersDto })
  async AddMembersToChat(
    @Req() req,
    @Body() addChatMembersDto: AddChatMembersDto,
    @Param('chatId', ParseUUIDPipe) chatId: string,
  ) {
    const userId: string = req.user.id;
    return this.chatService.addChatMembers(chatId, addChatMembersDto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':chatId/members')
  @ApiOperation({ summary: 'Get members of group chat' })
  async getGroupChatMembers(@Param('chatId', ParseUUIDPipe) chatId: string) {
    return this.chatService.getChatMembers(chatId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':chatId/members')
  @ApiOperation({ summary: 'Exit chat' })
  async exitChat(@Req() req, @Param('chatId', ParseUUIDPipe) chatId: string) {
    const userId: string = req.user.id;
    return this.chatService.exitGroupChat(chatId, userId);
  }
}
