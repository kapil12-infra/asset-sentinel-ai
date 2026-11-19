import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ConnectGitHubDto {
  @IsString()
  @MinLength(20)
  @MaxLength(500)
  token: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/)
  owner: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9._-]+$/)
  repository: string;
}
