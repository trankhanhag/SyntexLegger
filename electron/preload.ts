/**
 * Electron Preload Script
 * SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 *
 * This script runs in the renderer process before the web page loads.
 * It exposes a secure API to the renderer process.
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Machine ID for license validation
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

  // File dialogs
  showOpenDialog: (options: Electron.OpenDialogOptions) =>
    ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options: Electron.SaveDialogOptions) =>
    ipcRenderer.invoke('show-save-dialog', options),

  // Message box
  showMessageBox: (options: Electron.MessageBoxOptions) =>
    ipcRenderer.invoke('show-message-box', options),

  // Platform info
  platform: process.platform,
  isElectron: true
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getMachineId: () => Promise<string>;
      getAppVersion: () => Promise<string>;
      getUserDataPath: () => Promise<string>;
      showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
      showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
      showMessageBox: (options: Electron.MessageBoxOptions) => Promise<Electron.MessageBoxReturnValue>;
      platform: NodeJS.Platform;
      isElectron: boolean;
    };
  }
}
