import { IsIn, IsOptional } from 'class-validator';
import { AI_ANALYSIS_CATEGORIES } from './ai-analysis.types';

export class AnalyzeTestRunDto {
  @IsOptional()
  @IsIn(AI_ANALYSIS_CATEGORIES)
  category?: (typeof AI_ANALYSIS_CATEGORIES)[number];
}
