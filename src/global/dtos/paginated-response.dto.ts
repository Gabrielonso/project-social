import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from './pagination.dto';

class PaginationMetadata {
  @ApiProperty({
    type: Number,
    example: 40,
  })
  totalPages: number;

  @ApiProperty({
    type: Number,
    example: 1,
    default: 1,
  })
  currentPage: number;

  @ApiProperty({
    type: Number,
    example: 10,
    default: 10,
  })
  limit: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ type: Object, isArray: true, minItems: 10, maxItems: 100 })
  data: T;

  @ApiProperty({ type: PaginationMetadata })
  meta: PaginationMetadata;

  static build<T extends unknown[]>(
    data: T,
    paginationDto: Omit<PaginationDto, 'getSkip'> & { totalPages: number },
  ): PaginatedResponseDto<T> {
    return {
      data,
      meta: {
        currentPage: paginationDto.page,
        limit: paginationDto.limit,
        totalPages: paginationDto.totalPages,
      },
    };
  }
}
