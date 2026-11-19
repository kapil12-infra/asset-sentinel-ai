import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { AnalyzeTestRunDto } from './ai-analysis.dto';
import { AiAnalysisService } from './ai-analysis.service';
import { AiAnalysisCategory } from './ai-analysis.types';

@Controller()
export class AiAnalysisController {
  constructor(private readonly analysis: AiAnalysisService) {}

  @Post('projects/:projectId/ai-analysis/test-runs/:runId')
  analyzeTestRun(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Param('runId', ParseIntPipe) runId: number,
    @Body() dto: AnalyzeTestRunDto,
  ) {
    return this.analysis.analyzeTestRun(
      user.id,
      projectId,
      runId,
      (dto.category ?? 'functional') as AiAnalysisCategory,
    );
  }
}
