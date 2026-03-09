import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtOptionalGuard } from 'src/common/guards/jwt-optional.guard';
import { TrendsService } from './trends.service';
import { TrendQueryDto } from './dtos/trend-query.dto';

@ApiTags('Trends')
@Controller('trends')
export class TrendsController {
  constructor(private readonly trendsService: TrendsService) {}

  @UseGuards(JwtOptionalGuard)
  @Get('')
  @ApiOperation({ summary: 'Get trending hashtags (hottest first)' })
  async getTrends(@Query() query: TrendQueryDto) {
    return this.trendsService.getTrends(query);
  }

  @UseGuards(JwtOptionalGuard)
  @Get('categories')
  @ApiOperation({ summary: 'Get available trend categories' })
  async getTrendCategories() {
    return this.trendsService.getCategories();
  }

  @UseGuards(JwtOptionalGuard)
  @Get('categories/:category')
  @ApiOperation({
    summary: 'Get trends under a specific category (e.g. hashtags, sounds)',
  })
  async getTrendsByCategory(
    @Param('category') category: string,
    @Query() query: TrendQueryDto,
  ) {
    const key = category.toLowerCase();
    const knownCategories = ['sports', 'movies', 'tech', 'entertainment'];
    if (!knownCategories.includes(key)) {
      throw new BadRequestException('Unknown trend category');
    }

    return this.trendsService.getTrendsByCategory(key, query);
  }

  @UseGuards(JwtOptionalGuard)
  @ApiBearerAuth()
  @Get(':tag')
  @ApiOperation({ summary: 'Get posts/ads under a trending hashtag' })
  async getTrendFeed(@Param('tag') tag: string, @Req() req, @Query() query: TrendQueryDto) {
    const viewerId: string = req?.user?.id;
    return this.trendsService.getTrendFeed(tag, viewerId, query);
  }
}

