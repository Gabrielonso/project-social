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
import { ThoughtService } from './thought.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateThoughtDto } from './dtos/create-thought.dto';
import { UpdateThoughtDto } from './dtos/update-thought.dto';
import { ThoughtsFilterDto } from './dtos/thoughts-filter.dto';

@ApiTags('Thoughts')
@ApiBearerAuth()
@Controller('thoughts')
export class ThoughtController {
  constructor(private readonly thoughtService: ThoughtService) {}

  @UseGuards(JwtAuthGuard)
  @Post('')
  @ApiOperation({ summary: 'Create a thought' })
  @ApiBody({ type: CreateThoughtDto })
  async createThought(@Body() dto: CreateThoughtDto, @Req() req) {
    const userId: string = req.user.id;
    return this.thoughtService.createThought(dto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':thoughtId')
  @ApiOperation({
    summary: 'Edit a thought (allowed: title, content, isPublic)',
  })
  @ApiBody({ type: UpdateThoughtDto })
  async updateThought(
    @Param('thoughtId', ParseUUIDPipe) thoughtId: string,
    @Body() dto: UpdateThoughtDto,
    @Req() req,
  ) {
    const userId: string = req.user.id;
    return this.thoughtService.updateThought(thoughtId, dto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('')
  @ApiOperation({ summary: 'Get my thoughts' })
  @ApiBearerAuth()
  async getMyThoughts(
    @Query() thoughtsFilterDto: ThoughtsFilterDto,
    @Req() req,
  ) {
    const userId: string = req.user.id;
    return this.thoughtService.getMyThoughts(userId, thoughtsFilterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':thoughtId')
  @ApiOperation({ summary: 'Delete a thought' })
  deleteUser(
    @Param('thoughtId', new ParseUUIDPipe()) thoughtId: string,
    @Req() req,
  ) {
    const userId: string = req.user.id;
    return this.thoughtService.deleteThought(thoughtId, userId);
  }
}
