import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum PullRequestState {
  Open = 'open',
  Closed = 'closed',
  Merged = 'merged',
}

const bigintToNumber = {
  to: (value: number): number => value,
  from: (value: string | null): number => (value === null ? 0 : Number(value)),
};

@Entity({ name: 'pull_requests' })
@Index('IDX_pr_repoFullName', ['repoFullName'])
@Index('IDX_pr_state', ['state'])
@Index('IDX_pr_authorUsername', ['authorUsername'])
@Index('IDX_pr_createdAt', ['createdAt'])
export class PullRequest {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 987654 })
  @Column({ type: 'bigint', unique: true, transformer: bigintToNumber })
  githubId!: number;

  @ApiProperty({ example: 42 })
  @Column({ type: 'int' })
  number!: number;

  @ApiProperty({ example: 'feat: add prs module' })
  @Column({ type: 'varchar', length: 500 })
  title!: string;

  @ApiProperty({ nullable: true, example: 'This PR adds the prs module.' })
  @Column({ type: 'text', nullable: true })
  body!: string | null;

  @ApiProperty({ enum: PullRequestState, example: PullRequestState.Open })
  @Column({ type: 'enum', enum: PullRequestState, enumName: 'pull_requests_state_enum' })
  state!: PullRequestState;

  @ApiProperty({ nullable: true, example: 'octocat' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  authorUsername!: string | null;

  @ApiProperty({ example: 'acme/pr-pulse-api' })
  @Column({ type: 'varchar', length: 255 })
  repoFullName!: string;

  @ApiProperty({ example: 'https://github.com/acme/pr-pulse-api/pull/42' })
  @Column({ type: 'varchar', length: 512 })
  htmlUrl!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @Column({ type: 'timestamptz' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @Column({ type: 'timestamptz' })
  updatedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  mergedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  @Column({ type: 'timestamptz' })
  lastSyncedAt!: Date;
}
