import { ApiProperty } from '@nestjs/swagger';
import type { RestEndpointMethodTypes } from '@octokit/rest';

type OctokitRepo =
  RestEndpointMethodTypes['repos']['listForAuthenticatedUser']['response']['data'][number];

export class GithubRepoDto {
  @ApiProperty({ example: 123456 })
  id!: number;

  @ApiProperty({ example: 'pr-pulse-api' })
  name!: string;

  @ApiProperty({ example: 'acme/pr-pulse-api' })
  fullName!: string;

  @ApiProperty({ example: false })
  private!: boolean;

  @ApiProperty({ example: 'main' })
  defaultBranch!: string;

  static fromOctokit(repo: OctokitRepo): GithubRepoDto {
    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      defaultBranch: repo.default_branch,
    };
  }
}
