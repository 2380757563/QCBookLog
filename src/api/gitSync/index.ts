import { apiClient } from '@/api/apiClient';

export interface GitSyncStatus {
  configured: boolean;
  repoUrl: string;
  mirrors: string[];
  proxy?: string;
  branch: string;
  userName: string;
  userEmail: string;
  autoPush: boolean;
  tokenConfigured: boolean;
  localRepoExists: boolean;
  repoDir: string;
  lastSyncAt: string | null;
  lastError: string | null;
  ready: boolean;
}

export interface GitSyncConfig {
  repoUrl?: string;
  mirrors?: string;
  branch?: string;
  token?: string;
  userName?: string;
  userEmail?: string;
  autoPush?: boolean;
  proxy?: string;
}

export interface GitSyncResult {
  committed: boolean;
  pushed: boolean;
  commitHash?: string;
  note?: string;
  fileCount?: number;
}

export interface GitImportResult {
  imported: number;
  updated: number;
  created: number;
  skipped: number;
  syncedIds: number[];
}

export interface GitPullResult {
  pulled: boolean;
  fastForwarded?: boolean;
  rebased?: boolean;
  reset?: boolean;
  conflicts?: string[];
  import?: GitImportResult | null;
}

export interface GitHistoryDeleteResult {
  success: boolean;
  dropped?: string;
  head?: string;
  pushed?: boolean;
  purged?: string;
  committed?: boolean;
  commitHash?: string;
  note?: string;
}

export interface GitSyncService {
  getStatus(): Promise<GitSyncStatus>;
  configure(config: GitSyncConfig): Promise<GitSyncStatus>;
  syncAll(): Promise<GitSyncResult>;
  getPending(): Promise<{ reviews: PendingReview[]; count: number; unpushed?: UnpushedInfo }>;
  syncReview(id: number | string): Promise<GitSyncResult>;
  getHistory(reviewId: number | string): Promise<{ history: GitCommitEntry[]; filePath?: string; note?: string }>;
  getVersion(reviewId: number | string, commitHash: string): Promise<GitVersionData>;
  getDiff(reviewId: number | string, oldHash: string, newHash: string): Promise<{ diff: string }>;
  restore(reviewId: number | string, commitHash: string): Promise<{ success: boolean; result: GitSyncResult }>;
  pull(force?: boolean): Promise<GitPullResult>;
  deleteHistory(reviewId: number | string, commitHash: string): Promise<GitHistoryDeleteResult>;
  clearHistory(reviewId: number | string): Promise<GitHistoryDeleteResult>;
}

export interface UnpushedCommit {
  hash: string;
  date: string;
  message: string;
}

export interface UnpushedInfo {
  known: boolean;
  count: number;
  commits: UnpushedCommit[];
  error?: string;
  via?: string | null;
  speedTest?: Array<{ url: string; ok: boolean; ms: number; error: string | null }>;
}

export interface GitCommitEntry {
  hash: string;
  date: string;
  message: string;
  author: string;
}

export interface PendingReview {
  id: number;
  uuid: string;
  title: string;
  book_title: string;
  sync_status: string | null;
  updated_at: string;
}

export interface GitVersionData {
  content: string;
  data: Record<string, unknown>;
  commitHash: string;
}

class GitSyncServiceImpl implements GitSyncService {
  async getStatus(): Promise<GitSyncStatus> {
    return apiClient.get('/git/status');
  }

  async configure(config: GitSyncConfig): Promise<GitSyncStatus> {
    return apiClient.post('/git/configure', config);
  }

  async syncAll(): Promise<GitSyncResult> {
    return apiClient.post('/git/sync', {});
  }

  async getPending(): Promise<{ reviews: PendingReview[]; count: number; unpushed?: UnpushedInfo }> {
    return apiClient.get('/git/pending');
  }

  async syncReview(id: number | string): Promise<GitSyncResult> {
    return apiClient.post(`/git/sync-review/${id}`, {});
  }

  async getHistory(reviewId: number | string): Promise<{ history: GitCommitEntry[]; filePath?: string; note?: string }> {
    return apiClient.get(`/git/history/${reviewId}`);
  }

  async getVersion(reviewId: number | string, commitHash: string): Promise<GitVersionData> {
    return apiClient.get(`/git/version/${reviewId}/${commitHash}`);
  }

  async getDiff(reviewId: number | string, oldHash: string, newHash: string): Promise<{ diff: string }> {
    return apiClient.get(`/git/diff/${reviewId}?old=${encodeURIComponent(oldHash)}&new=${encodeURIComponent(newHash)}`);
  }

  async restore(reviewId: number | string, commitHash: string): Promise<{ success: boolean; result: GitSyncResult }> {
    return apiClient.post(`/git/restore/${reviewId}`, { commitHash });
  }

  async pull(force = false): Promise<GitPullResult> {
    return apiClient.post('/git/pull', { force });
  }

  async deleteHistory(reviewId: number | string, commitHash: string): Promise<GitHistoryDeleteResult> {
    return apiClient.delete(`/git/history/${reviewId}/${commitHash}`);
  }

  async clearHistory(reviewId: number | string): Promise<GitHistoryDeleteResult> {
    return apiClient.delete(`/git/history/${reviewId}`);
  }
}

export const gitSyncService: GitSyncService = new GitSyncServiceImpl();
export default gitSyncService;
