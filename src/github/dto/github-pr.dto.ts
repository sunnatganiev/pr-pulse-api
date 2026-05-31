import { ApiProperty } from '@nestjs/swagger';
import type { RestEndpointMethodTypes } from '@octokit/rest';

type OctokitPr = RestEndpointMethodTypes['pulls']['list']['response']['data'][number];

export class GithubPrDto {
  @ApiProperty({ example: 987654 })
  id!: number;

  @ApiProperty({ example: 42 })
  number!: number;

  @ApiProperty({ example: 'feat: add GitHub module' })
  title!: string;

  @ApiProperty({ nullable: true, example: 'This PR adds the github fetch layer.' })
  body!: string | null;

  @ApiProperty({ example: 'open' })
  state!: string;

  @ApiProperty({ nullable: true, example: 'octocat' })
  user!: string | null;

  @ApiProperty({ example: 'feature/github-module' })
  headRef!: string;

  @ApiProperty({ example: 'main' })
  baseRef!: string;

  @ApiProperty({ example: 'https://github.com/acme/pr-pulse-api/pull/42' })
  htmlUrl!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  mergedAt!: string | null;

  static fromOctokit(pr: OctokitPr): GithubPrDto {
    return {
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state,
      user: pr.user?.login ?? null,
      headRef: pr.head.ref,
      baseRef: pr.base.ref,
      htmlUrl: pr.html_url,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at,
    };
  }
}
