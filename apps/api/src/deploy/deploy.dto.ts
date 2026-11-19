import { IsIn, IsString, Matches } from 'class-validator';

const STAGE = /^[A-Z0-9_-]{1,12}$/;

export class DeployDto {
  @IsString()
  projectId: string;

  @Matches(STAGE, { message: 'stage must be 1-12 chars of A-Z 0-9 _ -' })
  stage: string;

  @IsIn(['Docker', 'Kubernetes', 'Serverless', 'Static'])
  method: 'Docker' | 'Kubernetes' | 'Serverless' | 'Static';
}

export class CreateEnvDto {
  @IsString()
  projectId: string;

  @Matches(STAGE, { message: 'stage must be 1-12 chars of A-Z 0-9 _ -' })
  stage: string;
}
