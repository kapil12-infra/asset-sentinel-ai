import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateDto {
  @IsString()
  @MinLength(12)
  @MaxLength(1000)
  prompt: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsIn(['Web App', 'API', 'Mobile', 'Full Stack', 'Platform'])
  type: 'Web App' | 'API' | 'Mobile' | 'Full Stack' | 'Platform';
}
