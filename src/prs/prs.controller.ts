import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrsService } from './prs.service';
import { PullRequest } from './entities/pull-request.entity';
import { PrFilterDto } from './dto/pr-filter.dto';
import { SyncPrsDto } from './dto/sync-prs.dto';

@ApiTags('prs')
@Controller('prs')
@UseGuards(JwtAuthGuard)
export class PrsController {
  constructor(private readonly prsService: PrsService) {}

  @Get()
  @ApiOperation({ summary: 'Lists pull requests with optional filters' })
  @ApiOkResponse({ type: PullRequest, isArray: true })
  findAll(@Query() filter: PrFilterDto): Promise<PullRequest[]> {
    return this.prsService.findAll(filter);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Syncs pull requests from GitHub into the database' })
  @ApiOkResponse({ type: PullRequest, isArray: true })
  sync(@Body() dto: SyncPrsDto): Promise<PullRequest[]> {
    return this.prsService.syncFromGithub(dto.repoFullName);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Returns a single pull request by id' })
  @ApiOkResponse({ type: PullRequest })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PullRequest> {
    return this.prsService.findOne(id);
  }
}
