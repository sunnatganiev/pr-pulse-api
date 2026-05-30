import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

export class MeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 12345 })
  githubId!: number;

  @ApiProperty({ example: 'octocat' })
  username!: string;

  @ApiProperty({ nullable: true, example: 'octo@example.com' })
  email!: string | null;

  @ApiProperty({ example: 'https://avatars.githubusercontent.com/u/12345' })
  avatarUrl!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastLoginAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  static fromUser(user: User): MeResponseDto {
    return {
      id: user.id,
      githubId: user.githubId,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
