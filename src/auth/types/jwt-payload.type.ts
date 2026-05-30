export interface JwtPayload {
  sub: string;
  githubId: number;
  tokenVersion?: number;
}
