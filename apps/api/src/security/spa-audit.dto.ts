import { IsBoolean, IsIn, IsOptional, IsUrl } from 'class-validator';

export class SpaAuditDto {
  @IsOptional()
  @IsIn(['source', 'dynamic', 'both'])
  mode: 'source' | 'dynamic' | 'both' = 'source';

  @IsOptional()
  @IsUrl({ require_protocol: true })
  targetUrl?: string;

  @IsOptional()
  @IsBoolean()
  authorizationConfirmed = false;
}
