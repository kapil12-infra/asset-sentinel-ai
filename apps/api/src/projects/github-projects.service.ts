import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CryptoService } from '../core/crypto.service';
import { PrismaService } from '../core/prisma.service';
import { ConnectGitHubDto } from './github-projects.dto';

type GitHubRepositoryResponse = {
  full_name: string;
  html_url: string;
  private: boolean;
  default_branch: string;
};

@Injectable()
export class GitHubProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  private async assertProjectOwner(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }

  private async githubRequest(
    token: string,
    owner: string,
    repository: string,
  ): Promise<GitHubRepositoryResponse> {
    const url =
      `https://api.github.com/repos/${encodeURIComponent(owner)}/` +
      encodeURIComponent(repository);

    let response: Response;

    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Asset-Sentinel-QA-AI',
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new BadRequestException('Unable to reach GitHub. Try again.');
    }

    if (response.status === 401) {
      throw new UnauthorizedException('GitHub token is invalid or expired');
    }

    if (response.status === 403) {
      throw new ForbiddenException(
        'GitHub denied access. Check the token permissions or rate limit.',
      );
    }

    if (response.status === 404) {
      throw new NotFoundException(
        'Repository not found or token cannot access it',
      );
    }

    if (!response.ok) {
      throw new BadRequestException('GitHub repository verification failed');
    }

    return (await response.json()) as GitHubRepositoryResponse;
  }

  async connect(
    userId: string,
    projectId: string,
    dto: ConnectGitHubDto,
  ) {
    await this.assertProjectOwner(userId, projectId);

    // Require a dedicated 32-byte encryption key for stored GitHub tokens.
    if (!/^[0-9a-fA-F]{64}$/.test(process.env.SECRETS_KEY ?? '')) {
      throw new BadRequestException(
        'Configure a dedicated 64-character hexadecimal SECRETS_KEY before connecting GitHub',
      );
    }

    const token = dto.token.trim();
    const repo = await this.githubRequest(token, dto.owner, dto.repository);

    const encryptedToken = this.crypto.encrypt(token);

    await this.prisma.projectRepository.upsert({
      where: { projectId },
      create: {
        projectId,
        owner: dto.owner,
        repositoryName: dto.repository,
        repositoryUrl: repo.html_url,
        defaultBranch: repo.default_branch,
        isPrivate: repo.private,
        tokenEnc: encryptedToken,
      },
      update: {
        owner: dto.owner,
        repositoryName: dto.repository,
        repositoryUrl: repo.html_url,
        defaultBranch: repo.default_branch,
        isPrivate: repo.private,
        tokenEnc: encryptedToken,
      },
    });

    return this.status(userId, projectId);
  }

  async status(userId: string, projectId: string) {
    await this.assertProjectOwner(userId, projectId);

    const repository = await this.prisma.projectRepository.findUnique({
      where: { projectId },
      select: {
        id: true,
        provider: true,
        owner: true,
        repositoryName: true,
        repositoryUrl: true,
        defaultBranch: true,
        isPrivate: true,
        connectedAt: true,
        updatedAt: true,
      },
    });

    return {
      connected: Boolean(repository),
      repository,
    };
  }

  async disconnect(userId: string, projectId: string) {
    await this.assertProjectOwner(userId, projectId);

    await this.prisma.projectRepository.deleteMany({
      where: { projectId },
    });

    return { ok: true };
  }
}
