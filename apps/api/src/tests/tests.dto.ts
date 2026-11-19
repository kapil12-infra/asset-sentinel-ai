import {
  ArrayNotEmpty,
  ArrayUnique,
  IsBoolean,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export const CANONICAL_TEST_MODULE_IDS = [
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

export const LEGACY_TEST_MODULE_IDS = [
  'automation',
  'static',
] as const;

export type CanonicalTestModuleId =
  (typeof CANONICAL_TEST_MODULE_IDS)[number];

export type AcceptedTestModuleId =
  | CanonicalTestModuleId
  | (typeof LEGACY_TEST_MODULE_IDS)[number];

const ACCEPTED_MODULE_IDS: readonly string[] = [
  ...CANONICAL_TEST_MODULE_IDS,
  ...LEGACY_TEST_MODULE_IDS,
];

export class RunTestsDto {
  @IsOptional()
  @IsIn([
    'all',
    'functional',
    'api',
    'automation',
    'regression',
    'performance',
  ])
  suite?:
    | 'all'
    | 'functional'
    | 'api'
    | 'automation'
    | 'regression'
    | 'performance';

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  @IsIn(ACCEPTED_MODULE_IDS, { each: true })
  moduleIds?: AcceptedTestModuleId[];

  @IsOptional()
  @IsString()
  @IsUUID()
  environmentId?: string;
  @IsOptional()
  @IsBoolean()
  authorizationConfirmed?: boolean;
}
