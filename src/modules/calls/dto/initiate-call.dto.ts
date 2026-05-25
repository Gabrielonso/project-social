import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { CallType } from '../enums/call-type.enum';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateCallDto {
  @ApiProperty({
    description: 'Callee ID',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
  })
  @IsUUID()
  @IsNotEmpty()
  calleeId: string;

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

  @ApiProperty({
    description: 'Call Type',
    example: CallType.AUDIO,
    enum: CallType,
  })
  @IsEnum(CallType)
  @IsNotEmpty()
  type: CallType;
}
