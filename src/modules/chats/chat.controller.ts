import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatsService } from './chats.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ChatsFilterDto } from './dtos/chats-filter.dto';
import { ChatMessagesFilterDto } from './dtos/chat-messages-filter.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('')
  @ApiOperation({ summary: 'Get My Chats' })
  @ApiBearerAuth()
  async getMyChats(@Req() req, @Query() chatsFilterDto: ChatsFilterDto) {
    const userId: string = req.user.id;
    return this.chatService.getMyChats(userId, chatsFilterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':chatId/messages')
  @ApiOperation({ summary: 'Get a chat messages' })
  @ApiBearerAuth()
  async getChatMessages(
    @Req() req,
    @Query() chatMessagesFilterDto: ChatMessagesFilterDto,
    @Param('chatId', ParseUUIDPipe) chatId: string,
  ) {
    const userId: string = req.user.id;
    return this.chatService.getChatMessages(
      userId,
      chatId,
      chatMessagesFilterDto,
    );
  }
}
