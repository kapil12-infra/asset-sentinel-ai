export const AI_ANALYSIS_CATEGORIES = [
  'functional',
  'api',
  'ui',
  'integration',
  'database',
  'regression',
  'smoke',
  'sanity',
  'compatibility',
  'performance',
  'security',
  'accessibility',
] as const;

export type AiAnalysisCategory =
  (typeof AI_ANALYSIS_CATEGORIES)[number];

export interface AiAnalysisFinding {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  explanation: string;
  rootCause: string;
  recommendation: string;
  verificationSteps: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface AiAnalysisResult {
  summary: string;
  category: AiAnalysisCategory;
  findings: AiAnalysisFinding[];
  limitations: string[];
  humanReviewRequired: true;
}

export interface SanitizedEvidence {
  text: string;
  truncated: boolean;
  originalCharacters: number;
}
