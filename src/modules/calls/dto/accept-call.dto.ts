import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptCallDto {
  @ApiProperty({
    description: 'Call UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  uuid: string;

  @ApiProperty({
    description: 'Room Name',
    example: 'room_a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  roomName: string;
}
