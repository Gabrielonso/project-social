import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtOptionalGuard } from 'src/common/guards/jwt-optional.guard';
import { SearchService } from './search.service';
import { GlobalSearchQueryDto } from './dtos/global-search-query.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @UseGuards(JwtOptionalGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({
    summary: 'Global search across people, posts and hashtags',
  })
  search(@Query() query: GlobalSearchQueryDto, @Req() req) {
    const viewerId: string | undefined = req?.user?.id;
    return this.searchService.search(query, viewerId);
  }
}
