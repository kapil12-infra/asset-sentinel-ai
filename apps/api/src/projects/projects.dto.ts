import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const PATH = /^[\w\-./]+\.\w+$/;

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  desc?: string;

  @IsOptional()
  @IsIn(['Planning', 'In Progress', 'In Review', 'Live'])
  state?: string;
}

export class FileDto {
  @IsString()
  @MaxLength(200)
  @Matches(PATH, { message: 'Invalid file path' })
  path: string;

  @IsString()
  @MaxLength(500000)
  content: string;
}

export class AssistDto {
  @IsString()
  @MaxLength(200)
  @Matches(PATH, { message: 'Invalid file path' })
  path: string;

  @IsString()
  @MinLength(4)
  @MaxLength(500)
  prompt: string;
}
