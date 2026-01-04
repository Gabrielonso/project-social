import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { LikesService } from './services/likes.services';
import { ToggleLikeDto } from './dtos/toggle-like.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Engagements')
@ApiBearerAuth()
@Controller('engagements')
@UseGuards(JwtAuthGuard)
export class EngagementsController {
  constructor(private readonly likesService: LikesService) {}

  @Post('like')
  @ApiOperation({ summary: 'Toggle like for posts,ads, etc' })
  @ApiBody({ type: ToggleLikeDto })
  async toggleLike(@Req() req, @Body() dto: ToggleLikeDto) {
    const userId: string = req.user.id;
    return this.likesService.toggleLike(dto.entity, dto.entityId, userId);
  }
}
