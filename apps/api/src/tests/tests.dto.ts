import { IsIn, IsOptional } from 'class-validator';

export class RunTestsDto {
  @IsOptional()
  @IsIn(['all', 'functional', 'api', 'automation', 'regression', 'performance'])
  suite?: 'all' | 'functional' | 'api' | 'automation' | 'regression' | 'performance';
}
