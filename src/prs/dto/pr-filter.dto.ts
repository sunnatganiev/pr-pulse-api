import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PullRequestState } from '../entities/pull-request.entity';

export class PrFilterDto {
  @ApiPropertyOptional({ enum: PullRequestState })
  @IsOptional()
  @IsEnum(PullRequestState)
  state?: PullRequestState;

  @ApiPropertyOptional({ example: 'acme/pr-pulse-api', description: 'repoFullName' })
  @IsOptional()
  @IsString()
  repo?: string;

  @ApiPropertyOptional({ example: 'octocat', description: 'authorUsername' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
