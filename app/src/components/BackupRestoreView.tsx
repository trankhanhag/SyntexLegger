/**
 * BackupRestoreView - Backup and Restore Management
 * SyntexLegger - Database Backup UI
 */

import React, { useState, useEffect, useRef } from 'react';
import { useBackupStore } from '../stores/useBackupStore';
import { SmartTable, type ColumnDef } from './SmartTable';
import { FormModal } from './FormModal';
import logger from '../utils/logger';

// Format helpers
const formatDateTimeVN = (dateStr: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatNumber = (num: number) => {
  return num?.toLocaleString('vi-VN') || '0';
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Tab type
type TabType = 'backup' | 'restore' | 'schedule';

export const BackupRestoreView: React.FC = () => {
  const {
    backupHistory,
    restoreHistory,
    isLoading,
    error,
    backupInProgress,
    backupProgress,
    restoreInProgress,
    restoreProgress,
    uploadedBackup,
    needsPassword,
    scheduleSettings,
    fetchHistory,
    fetchScheduleSettings,
    createBackup,
    uploadBackupFile,
    previewRestore,
    executeRestore,
    downloadBackup,
    deleteBackup,
    updateScheduleSettings,
    clearUploadedBackup,
    setError,
    clearError
  } = useBackupStore();

  const [activeTab, setActiveTab] = useState<TabType>('backup');
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [restorePreview, setRestorePreview] = useState<any>(null);

  // Backup options
  const [encryptBackup, setEncryptBackup] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [backupNotes, setBackupNotes] = useState('');

  // Restore options
  const [restorePassword, setRestorePassword] = useState('');
  const [createPreBackup, setCreatePreBackup] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Schedule settings local state
  const [localSchedule, setLocalSchedule] = useState({
    enabled: false,
    frequency: 'daily' as 'daily' | 'weekly',
    time: '02:00',
    day: 0,
    retention: 7,
    defaultEncrypt: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHistory();
    fetchScheduleSettings();
  }, []);


  useEffect(() => {
    if (scheduleSettings) {
      setLocalSchedule({
        enabled: scheduleSettings.backup_schedule_enabled,
        frequency: scheduleSettings.backup_schedule_frequency,
        time: scheduleSettings.backup_schedule_time,
        day: scheduleSettings.backup_schedule_day,
        retention: scheduleSettings.backup_retention_count,
        defaultEncrypt: scheduleSettings.backup_encryption_default
      });
    }
  }, [scheduleSettings]);

  // Create backup handler
  const handleCreateBackup = async () => {
    if (encryptBackup) {
      if (!backupPassword) {
        setError('Vui lòng nhập mật khẩu');
        return;
      }
      if (backupPassword !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp');
        return;
      }
      if (backupPassword.length < 6) {
        setError('Mật khẩu phải có ít nhất 6 ký tự');
        return;
      }
    }

    setShowBackupModal(false);
    const success = await createBackup(encryptBackup, backupPassword || undefined, backupNotes || undefined);

    if (success) {
      setEncryptBackup(false);
      setBackupPassword('');
      setConfirmPassword('');
      setBackupNotes('');
    }
  };

  // File select handler - immediately upload and validate
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    logger.debug('[Restore] File selected:', file.name, 'Size:', file.size);

    // Reset state
    setSelectedFile(file);
    setRestorePassword('');
    clearError();

    // Immediately try to upload and validate (without password first)
    logger.debug('[Restore] Starting upload validation...');
    const success = await uploadBackupFile(file);
    logger.debug('[Restore] Upload result:', success);

    if (success) {
      setShowRestoreModal(true);
    }
    // If file needs password, the store will set needsPassword=true
    // and the password modal will show (handled by render condition)

    // Reset file input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload and validate backup file (with password for encrypted files)
  const handleUploadWithPassword = async () => {
    if (!selectedFile || !restorePassword) return;

    const success = await uploadBackupFile(selectedFile, restorePassword);

    if (success) {
      setShowRestoreModal(true);
    }
    // If password is wrong, error will be shown by the store
  };

  // Preview restore
  const handlePreview = async () => {
    const preview = await previewRestore();
    if (preview) {
      setRestorePreview(preview);
      setShowPreviewModal(true);
    }
  };

  // Execute restore
  const handleExecuteRestore = async () => {
    const confirmed = window.confirm(
      'CẢNH BÁO: Thao tác này sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại!\n\n' +
      'Bạn có chắc chắn muốn khôi phục dữ liệu từ bản sao lưu này?'
    );

    if (confirmed) {
      const success = await executeRestore(createPreBackup);
      if (success) {
        setShowRestoreModal(false);
        setShowPreviewModal(false);
        setSelectedFile(null);
        alert('Khôi phục dữ liệu thành công! Trang sẽ được tải lại.');
        window.location.reload();
      }
    }
  };

  // Save schedule settings
  const handleSaveSchedule = async () => {
    const success = await updateScheduleSettings({
      backup_schedule_enabled: localSchedule.enabled,
      backup_schedule_frequency: localSchedule.frequency,
      backup_schedule_time: localSchedule.time,
      backup_schedule_day: localSchedule.day,
      backup_retention_count: localSchedule.retention,
      backup_encryption_default: localSchedule.defaultEncrypt
    });

    if (success) {
      alert('Đã lưu cấu hình backup tự động!');
    }
  };

  // Table columns
  const backupColumns: ColumnDef[] = [
    {
      field: 'created_at',
      headerName: 'Thời điểm',
      width: 'w-44',
      renderCell: (v: string) => formatDateTimeVN(v)
    },
    {
      field: 'backup_type',
      headerName: 'Loại',
      width: 'w-28',
      renderCell: (v: string) => {
        const types: Record<string, string> = {
          'MANUAL': 'Thủ công',
          'SCHEDULED': 'Tự động',
          'PRE_RESTORE': 'Pre-restore'
        };
        return types[v] || v;
      }
    },
    {
      field: 'file_size',
      headerName: 'Kích thước',
      width: 'w-24',
      align: 'right',
      renderCell: (v: number) => formatFileSize(v)
    },
    {
      field: 'record_count',
      headerName: 'Bản ghi',
      width: 'w-24',
      align: 'right',
      renderCell: (v: number) => formatNumber(v)
    },
    {
      field: 'is_encrypted',
      headerName: 'Mã hóa',
      width: 'w-20',
      align: 'center',
      renderCell: (v: boolean) => v ? (
        <span className="material-symbols-outlined text-amber-500 text-sm">lock</span>
      ) : (
        <span className="material-symbols-outlined text-slate-300 text-sm">lock_open</span>
      )
    },
    {
      field: 'created_by',
      headerName: 'Người tạo',
      width: 'w-28'
    },
    {
      field: 'status',
      headerName: 'Trạng thái',
      width: 'w-28',
      align: 'center',
      renderCell: (v: string) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
          v === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
          v === 'FAILED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        }`}>
          {v === 'COMPLETED' ? 'Hoàn thành' :
           v === 'FAILED' ? 'Thất bại' : 'Đang xử lý'}
        </span>
      )
    },
    {
      field: 'id',
      headerName: '',
      width: 'w-24',
      type: 'actions',
      renderCell: (_: string, row: any) => (
        <div className="flex gap-1">
          {row.file_path && (
            <button
              onClick={() => downloadBackup(row.id)}
              className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
              title="Tải xuống"
            >
              <span className="material-symbols-outlined text-sm">download</span>
            </button>
          )}
          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc muốn xóa bản backup này?')) {
                deleteBackup(row.id);
              }
            }}
            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded"
            title="Xóa"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      )
    }
  ];

  const restoreColumns: ColumnDef[] = [
    {
      field: 'created_at',
      headerName: 'Thời điểm',
      width: 'w-44',
      renderCell: (v: string) => formatDateTimeVN(v)
    },
    {
      field: 'backup_file_name',
      headerName: 'File backup',
      width: 'w-56'
    },
    {
      field: 'tables_restored',
      headerName: 'Số bảng',
      width: 'w-24',
      align: 'center'
    },
    {
      field: 'records_restored',
      headerName: 'Bản ghi',
      width: 'w-28',
      align: 'right',
      renderCell: (v: number) => formatNumber(v)
    },
    {
      field: 'duration_seconds',
      headerName: 'Thời gian',
      width: 'w-24',
      align: 'right',
      renderCell: (v: number) => v ? `${v}s` : '-'
    },
    {
      field: 'restored_by',
      headerName: 'Người thực hiện',
      width: 'w-32'
    },
    {
      field: 'status',
      headerName: 'Trạng thái',
      width: 'w-28',
      align: 'center',
      renderCell: (v: string) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
          v === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
          v === 'FAILED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        }`}>
          {v === 'COMPLETED' ? 'Hoàn thành' :
           v === 'FAILED' ? 'Thất bại' : 'Đang xử lý'}
        </span>
      )
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            Sao lưu & Khôi phục dữ liệu
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Quản lý bản sao lưu và khôi phục dữ liệu kế toán
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".slbak,.zip"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || restoreInProgress}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">upload_file</span>
            Khôi phục từ file
          </button>
          <button
            onClick={() => setShowBackupModal(true)}
            disabled={backupInProgress}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all disabled:opacity-50"
          >
            {backupInProgress ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                Đang sao lưu...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">backup</span>
                Tạo bản sao lưu
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <span className="material-symbols-outlined text-sm">error</span>
            <span className="text-sm font-medium flex-1">{error}</span>
            <button onClick={clearError} className="text-rose-500 hover:text-rose-700">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 px-4">
        {[
          { id: 'backup', label: 'Lịch sử sao lưu', icon: 'backup' },
          { id: 'restore', label: 'Lịch sử khôi phục', icon: 'restore' },
          { id: 'schedule', label: 'Cấu hình tự động', icon: 'schedule' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'backup' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <SmartTable
              data={backupHistory}
              columns={backupColumns}
              keyField="id"
              minRows={10}
              loading={isLoading}
            />
          </div>
        )}

        {activeTab === 'restore' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <SmartTable
              data={restoreHistory}
              columns={restoreColumns}
              keyField="id"
              minRows={10}
              loading={isLoading}
            />
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="max-w-2xl">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-800 dark:text-white">Backup tự động</h4>
                  <p className="text-sm text-slate-500">Tự động tạo backup theo lịch</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSchedule.enabled}
                    onChange={(e) => setLocalSchedule(s => ({ ...s, enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tần suất
                </label>
                <select
                  value={localSchedule.frequency}
                  onChange={(e) => setLocalSchedule(s => ({ ...s, frequency: e.target.value as 'daily' | 'weekly' }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                >
                  <option value="daily">Hàng ngày</option>
                  <option value="weekly">Hàng tuần</option>
                </select>
              </div>

              {/* Day of week (for weekly) */}
              {localSchedule.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Ngày trong tuần
                  </label>
                  <select
                    value={localSchedule.day}
                    onChange={(e) => setLocalSchedule(s => ({ ...s, day: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value={0}>Chủ nhật</option>
                    <option value={1}>Thứ 2</option>
                    <option value={2}>Thứ 3</option>
                    <option value={3}>Thứ 4</option>
                    <option value={4}>Thứ 5</option>
                    <option value={5}>Thứ 6</option>
                    <option value={6}>Thứ 7</option>
                  </select>
                </div>
              )}

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Thời điểm
                </label>
                <input
                  type="time"
                  value={localSchedule.time}
                  onChange={(e) => setLocalSchedule(s => ({ ...s, time: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                />
              </div>

              {/* Retention */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Số bản backup giữ lại
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={localSchedule.retention}
                  onChange={(e) => setLocalSchedule(s => ({ ...s, retention: parseInt(e.target.value) || 7 }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                />
                <p className="text-xs text-slate-500 mt-1">Các bản backup cũ hơn sẽ tự động bị xóa</p>
              </div>

              {/* Default encryption */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="defaultEncrypt"
                  checked={localSchedule.defaultEncrypt}
                  onChange={(e) => setLocalSchedule(s => ({ ...s, defaultEncrypt: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"
                />
                <label htmlFor="defaultEncrypt" className="text-sm text-slate-700 dark:text-slate-300">
                  Mã hóa backup tự động
                </label>
              </div>

              {/* Save button */}
              <button
                onClick={handleSaveSchedule}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Backup Modal */}
      {showBackupModal && (
        <FormModal
          title="Tạo bản sao lưu"
          onClose={() => setShowBackupModal(false)}
          sizeClass="max-w-md"
          icon="backup"
        >
          <div className="space-y-4">
            {/* Browser support info */}
            {'showSaveFilePicker' in window ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-700 dark:text-emerald-400 text-sm">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>Bạn sẽ được chọn nơi lưu file backup</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
                <span className="material-symbols-outlined text-base">info</span>
                <span>File backup sẽ được tải về thư mục Downloads mặc định</span>
              </div>
            )}

            {/* Encrypt option */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <input
                type="checkbox"
                id="encryptBackup"
                checked={encryptBackup}
                onChange={(e) => setEncryptBackup(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <label htmlFor="encryptBackup" className="text-sm text-slate-700 dark:text-slate-300">
                Mã hóa file backup bằng mật khẩu
              </label>
            </div>

            {/* Password fields */}
            {encryptBackup && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    value={backupPassword}
                    onChange={(e) => setBackupPassword(e.target.value)}
                    placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Xác nhận mật khẩu
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  />
                </div>
              </>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ghi chú (tùy chọn)
              </label>
              <textarea
                value={backupNotes}
                onChange={(e) => setBackupNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowBackupModal(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateBackup}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all"
              >
                Tạo backup
              </button>
            </div>
          </div>
        </FormModal>
      )}

      {/* Password prompt for encrypted backup */}
      {selectedFile && needsPassword && !uploadedBackup && (
        <FormModal
          title="Nhập mật khẩu"
          onClose={() => {
            setSelectedFile(null);
            clearError();
          }}
          sizeClass="max-w-sm"
          icon="lock"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              File backup này đã được mã hóa. Vui lòng nhập mật khẩu để tiếp tục.
            </p>
            <input
              type="password"
              value={restorePassword}
              onChange={(e) => setRestorePassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedFile(null);
                  clearError();
                }}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleUploadWithPassword}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </FormModal>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreModal && uploadedBackup && (
        <FormModal
          title="Khôi phục dữ liệu"
          onClose={() => {
            setShowRestoreModal(false);
            clearUploadedBackup();
            setSelectedFile(null);
          }}
          sizeClass="max-w-2xl"
          icon="restore"
        >
          <div className="space-y-4">
            {/* Warning */}
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-amber-600 text-xl">warning</span>
                <div>
                  <h5 className="font-bold text-amber-800 dark:text-amber-400">Cảnh báo quan trọng</h5>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Thao tác khôi phục sẽ <strong>GHI ĐÈ</strong> toàn bộ dữ liệu hiện tại.
                    Hãy đảm bảo bạn đã sao lưu dữ liệu hiện tại trước khi tiếp tục.
                  </p>
                </div>
              </div>
            </div>

            {/* Backup Info */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
              <h5 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase">
                Thông tin bản sao lưu
              </h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Ngày tạo:</span>
                  <span className="ml-2 font-medium text-slate-800 dark:text-white">
                    {formatDateTimeVN(uploadedBackup.manifest.created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Người tạo:</span>
                  <span className="ml-2 font-medium text-slate-800 dark:text-white">
                    {uploadedBackup.manifest.created_by}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Số bảng:</span>
                  <span className="ml-2 font-medium text-slate-800 dark:text-white">
                    {uploadedBackup.manifest.statistics.total_tables}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Tổng bản ghi:</span>
                  <span className="ml-2 font-medium text-slate-800 dark:text-white">
                    {formatNumber(uploadedBackup.manifest.statistics.total_records)}
                  </span>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <input
                type="checkbox"
                id="preBackup"
                checked={createPreBackup}
                onChange={(e) => setCreatePreBackup(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <label htmlFor="preBackup" className="text-sm text-blue-700 dark:text-blue-300">
                Tự động tạo bản sao lưu dữ liệu hiện tại trước khi khôi phục
              </label>
            </div>

            {/* Restore Progress */}
            {restoreInProgress && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-blue-600 animate-spin">sync</span>
                  <span className="font-medium text-blue-700 dark:text-blue-400">
                    Đang khôi phục dữ liệu...
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${restoreProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  clearUploadedBackup();
                  setSelectedFile(null);
                }}
                disabled={restoreInProgress}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handlePreview}
                disabled={restoreInProgress}
                className="flex-1 py-2.5 bg-slate-800 dark:bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-all disabled:opacity-50"
              >
                Xem trước
              </button>
              <button
                onClick={handleExecuteRestore}
                disabled={restoreInProgress}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-lg font-bold shadow-lg shadow-rose-500/30 hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                {restoreInProgress ? 'Đang xử lý...' : 'Khôi phục ngay'}
              </button>
            </div>
          </div>
        </FormModal>
      )}

      {/* Preview Modal */}
      {showPreviewModal && restorePreview && (
        <FormModal
          title="Xem trước khôi phục"
          onClose={() => setShowPreviewModal(false)}
          sizeClass="max-w-3xl"
          icon="preview"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h5 className="font-bold text-blue-700 dark:text-blue-400 mb-2">Dữ liệu backup</h5>
                <p>Tổng: {formatNumber(restorePreview.backupInfo.total_records)} bản ghi</p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <h5 className="font-bold text-amber-700 dark:text-amber-400 mb-2">Dữ liệu hiện tại (sẽ bị ghi đè)</h5>
                <p>Tổng: {formatNumber(Object.values(restorePreview.tableCounts.current).reduce((a: number, b: any) => a + b, 0))} bản ghi</p>
              </div>
            </div>

            <div className="max-h-64 overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Bảng</th>
                    <th className="text-right px-3 py-2 font-medium">Backup</th>
                    <th className="text-right px-3 py-2 font-medium">Hiện tại</th>
                    <th className="text-right px-3 py-2 font-medium">Thay đổi</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(restorePreview.tableCounts.backup).map(table => {
                    const backupCount = restorePreview.tableCounts.backup[table] || 0;
                    const currentCount = restorePreview.tableCounts.current[table] || 0;
                    const diff = backupCount - currentCount;
                    return (
                      <tr key={table} className="border-t border-slate-100 dark:border-slate-700">
                        <td className="px-3 py-2 font-mono text-xs">{table}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(backupCount)}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(currentCount)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${
                          diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}>
                          {diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium"
              >
                Đóng
              </button>
              <button
                onClick={handleExecuteRestore}
                disabled={restoreInProgress}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-lg font-bold"
              >
                Xác nhận khôi phục
              </button>
            </div>
          </div>
        </FormModal>
      )}
    </div>
  );
};

export default BackupRestoreView;
