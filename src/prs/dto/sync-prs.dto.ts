import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class SyncPrsDto {
  @ApiProperty({ example: 'acme/pr-pulse-api', description: '"owner/repo" format' })
  @IsString()
  @Matches(/^[^/\s]+\/[^/\s]+$/, {
    message: 'repoFullName must be in "owner/repo" format',
  })
  repoFullName!: string;
}
