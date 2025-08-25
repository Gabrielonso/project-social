// create-opportunity.dto.ts
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  IsUrl,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OpportunityAmountType } from '../enums/oppurtunity-amount-type.enum';
import { ApiProperty } from '@nestjs/swagger';

class CreateClientDto {
  @ApiProperty({
    description: 'Name of client',
    example: 'Global Tech. Limited',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Instagram handle of client',
    example: 'https://instagram.com/gtlinited',
  })
  @IsUrl()
  @IsNotEmpty()
  instagram?: string;

  @ApiProperty({
    description: 'TikTok handle of client',
    example: 'https://tiktok.com/gtlinited',
  })
  @IsUrl()
  @IsNotEmpty()
  tiktok?: string;

  @ApiProperty({
    description: 'X handle of client',
    example: 'https://x.com/gtlinited',
  })
  @IsUrl()
  @IsNotEmpty()
  xHandle?: string;
}

class CreateFaqDto {
  @ApiProperty({
    description: 'Frequently asked question about opportunity',
    example: 'Which audience is this opportunity available to?',
  })
  @IsString()
  question: string;

  @ApiProperty({
    description: 'Answer to a frequently asked question about opportunity',
    example:
      'This opportunity is open to any one capable regardless of your location. You can participate',
  })
  @IsString()
  answer: string;
}

export class CreateOpportunityDto {
  @ApiProperty({
    description: 'Title of opportunity',
    example: 'Global Talent Hunt 2.0',
  })
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Description of opportunity',
    example:
      'Global Talent Hunt 2.0 is an exciting opportunity that allows talents from all over the world to have access to everything... blah blah blah',
  })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Amount type associated with opportunity',
    example: OpportunityAmountType.OPEN,
    enum: OpportunityAmountType,
  })
  @IsEnum(OpportunityAmountType)
  @IsNotEmpty()
  amountType?: OpportunityAmountType;

  @ApiProperty({
    description: 'Min Amount associated with opportunity',
    example: '300000',
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  minAmount: number;

  @ApiProperty({
    description: 'Max Amount associated with opportunity',
    example: '1000000',
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  maxAmount: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateClientDto)
  client?: CreateClientDto;

  @IsArray()
  @IsOptional()
  keyWords?: string[]; // pass skill IDs here

  @ArrayMinSize(1)
  @IsArray()
  @IsNotEmpty()
  skills?: number[]; // pass skill IDs here

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFaqDto)
  faqs?: CreateFaqDto[];

  @ApiProperty({
    description: 'When is this opportunity starting',
    example: '2025-08-23T00:00:00.254Z',
  })
  @IsOptional()
  startDateTime: Date;

  @ApiProperty({
    description: 'When is this opportunity ending',
    example: '2025-08-23T00:00:00.254Z',
  })
  @IsOptional()
  endDateTime: Date;
}
