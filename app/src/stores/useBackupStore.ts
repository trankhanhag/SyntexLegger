/**
 * Backup Store
 * Manages backup and restore state
 */

import { create } from 'zustand';
import api from '../api';
import logger from '../utils/logger';

interface BackupRecord {
  id: string;
  backup_type: string;
  file_name: string;
  file_size: number;
  record_count: number;
  table_count: number;
  status: string;
  progress: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number;
  created_by: string;
  notes: string | null;
  checksum: string;
  is_encrypted: boolean;
  file_path: string | null;
  created_at: string;
}

interface RestoreRecord {
  id: string;
  backup_id: string | null;
  backup_file_name: string;
  status: string;
  progress: number;
  error_message: string | null;
  tables_restored: number;
  records_restored: number;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number;
  restored_by: string;
  pre_restore_backup_id: string | null;
  created_at: string;
}

interface ScheduleSettings {
  backup_schedule_enabled: boolean;
  backup_schedule_frequency: 'daily' | 'weekly';
  backup_schedule_time: string;
  backup_schedule_day: number;
  backup_retention_count: number;
  backup_encryption_default: boolean;
  status?: {
    isEnabled: boolean;
    isRunning: boolean;
    nextRun: string | null;
  };
}

interface UploadedBackup {
  uploadId: string;
  manifest: {
    version: string;
    created_at: string;
    created_by: string;
    statistics: {
      total_tables: number;
      total_records: number;
      tables: Record<string, number>;
    };
  };
  tables: string[];
  isEncrypted: boolean;
}

interface BackupState {
  // History data
  backupHistory: BackupRecord[];
  restoreHistory: RestoreRecord[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Backup progress
  backupInProgress: boolean;
  backupProgress: number;

  // Restore state
  restoreInProgress: boolean;
  restoreProgress: number;
  uploadedBackup: UploadedBackup | null;
  needsPassword: boolean;

  // Schedule settings
  scheduleSettings: ScheduleSettings | null;

  // Actions
  fetchHistory: () => Promise<void>;
  fetchScheduleSettings: () => Promise<void>;
  createBackup: (encrypt?: boolean, password?: string, notes?: string) => Promise<boolean>;
  uploadBackupFile: (file: File, password?: string) => Promise<boolean>;
  previewRestore: () => Promise<any>;
  executeRestore: (createPreRestoreBackup?: boolean) => Promise<boolean>;
  downloadBackup: (id: string) => Promise<void>;
  deleteBackup: (id: string) => Promise<boolean>;
  updateScheduleSettings: (settings: Partial<ScheduleSettings>) => Promise<boolean>;
  clearUploadedBackup: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useBackupStore = create<BackupState>((set, get) => ({
  backupHistory: [],
  restoreHistory: [],
  isLoading: false,
  error: null,
  backupInProgress: false,
  backupProgress: 0,
  restoreInProgress: false,
  restoreProgress: 0,
  uploadedBackup: null,
  needsPassword: false,
  scheduleSettings: null,

  fetchHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const [backupRes, restoreRes] = await Promise.all([
        api.get('/backup/history'),
        api.get('/restore/history')
      ]);
      set({
        backupHistory: backupRes.data,
        restoreHistory: restoreRes.data,
        isLoading: false
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || error.message,
        isLoading: false
      });
    }
  },

  fetchScheduleSettings: async () => {
    try {
      const response = await api.get('/backup/schedule');
      set({ scheduleSettings: response.data });
    } catch (error: any) {
      logger.error('Failed to fetch schedule settings:', error);
    }
  },

  createBackup: async (encrypt = false, password?: string, notes?: string) => {
    set({ backupInProgress: true, backupProgress: 10, error: null });

    try {
      // Show indeterminate progress while server is working
      const progressInterval = setInterval(() => {
        const currentProgress = get().backupProgress;
        if (currentProgress < 80) {
          set({ backupProgress: currentProgress + 5 });
        }
      }, 500);

      const response = await api.post('/backup/create',
        { encrypt, password, notes },
        {
          responseType: 'blob',
          timeout: 600000 // 10 minutes
        }
      );

      clearInterval(progressInterval);
      set({ backupProgress: 90 });

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `backup_${new Date().toISOString().slice(0, 10)}.slbak`;

      const blob = new Blob([response.data], { type: 'application/zip' });

      // Helper function for regular download
      const downloadFile = () => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };

      // Try to use File System Access API for choosing save location
      // This API is only available in secure contexts (HTTPS or localhost)
      const canUseSavePicker = 'showSaveFilePicker' in window &&
        (window.location.protocol === 'https:' || window.location.hostname === 'localhost');

      if (canUseSavePicker) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'SyntexLegger Backup',
              accept: { 'application/zip': ['.slbak'] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (err: any) {
          // User cancelled - don't download automatically
          if (err.name === 'AbortError') {
            set({ backupInProgress: false, backupProgress: 0 });
            return false;
          }
          // Other error - fallback to regular download
          logger.warn('showSaveFilePicker failed, using fallback:', err);
          downloadFile();
        }
      } else {
        // Fallback for browsers without File System Access API
        downloadFile();
      }

      set({ backupInProgress: false, backupProgress: 100 });

      // Refresh history
      get().fetchHistory();

      return true;
    } catch (error: any) {
      set({
        backupInProgress: false,
        backupProgress: 0,
        error: error.response?.data?.error || 'Tạo backup thất bại'
      });
      return false;
    }
  },

  uploadBackupFile: async (file: File, password?: string) => {
    logger.debug('[BackupStore] uploadBackupFile called, file:', file.name);
    set({ isLoading: true, error: null, needsPassword: false });

    try {
      const formData = new FormData();
      formData.append('backup', file);
      if (password) {
        formData.append('password', password);
      }

      logger.debug('[BackupStore] Sending upload request...');
      const response = await api.post('/restore/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000 // 5 minutes
      });
      logger.debug('[BackupStore] Upload response:', response.data);

      if (response.data.valid) {
        set({
          uploadedBackup: {
            uploadId: response.data.uploadId,
            manifest: response.data.manifest,
            tables: response.data.tables,
            isEncrypted: response.data.isEncrypted
          },
          isLoading: false,
          needsPassword: false
        });
        return true;
      } else {
        if (response.data.isEncrypted && !password) {
          set({
            needsPassword: true,
            error: response.data.error,
            isLoading: false
          });
        } else {
          set({
            error: response.data.error,
            isLoading: false
          });
        }
        return false;
      }
    } catch (error: any) {
      logger.error('[BackupStore] Upload error:', error);
      set({
        error: error.response?.data?.error || error.message,
        isLoading: false
      });
      return false;
    }
  },

  previewRestore: async () => {
    const { uploadedBackup } = get();
    if (!uploadedBackup) return null;

    try {
      const response = await api.post(`/restore/preview/${uploadedBackup.uploadId}`);
      return response.data;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      return null;
    }
  },

  executeRestore: async (createPreRestoreBackup = true) => {
    const { uploadedBackup } = get();
    if (!uploadedBackup) return false;

    set({ restoreInProgress: true, restoreProgress: 0, error: null });

    try {
      await api.post(`/restore/execute/${uploadedBackup.uploadId}`, {
        createPreRestoreBackup
      });

      set({
        restoreInProgress: false,
        restoreProgress: 100,
        uploadedBackup: null
      });

      // Refresh history
      get().fetchHistory();

      return true;
    } catch (error: any) {
      set({
        restoreInProgress: false,
        error: error.response?.data?.error || error.message
      });
      return false;
    }
  },

  downloadBackup: async (id: string) => {
    try {
      const response = await api.get(`/backup/download/${id}`, {
        responseType: 'blob'
      });

      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `backup.slbak`;

      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
    }
  },

  deleteBackup: async (id: string) => {
    try {
      await api.delete(`/backup/history/${id}`);
      get().fetchHistory();
      return true;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      return false;
    }
  },

  updateScheduleSettings: async (settings: Partial<ScheduleSettings>) => {
    try {
      const response = await api.post('/backup/schedule', settings);
      set({ scheduleSettings: response.data.settings });
      return true;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      return false;
    }
  },

  clearUploadedBackup: () => {
    set({ uploadedBackup: null, needsPassword: false });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  }
}));
