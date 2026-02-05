/**
 * Electron Main Process
 * SyntexLegger - Kế toán Doanh nghiệp theo TT 99/2025/TT-BTC
 *
 * This is the entry point for the Electron application.
 * It starts the local server and creates the main window.
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getMachineId } from './license/fingerprint';

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

// Server configuration
const SERVER_PORT = 3000;
const SERVER_HOST = 'localhost';

// Paths
const isDev = process.env.NODE_ENV === 'development';
const resourcesPath = isDev
  ? path.join(__dirname, '..')
  : process.resourcesPath!;

/**
 * Start the local Express server
 */
async function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(resourcesPath, 'server', 'index.js');

    // Check if server exists
    if (!fs.existsSync(serverPath)) {
      console.error('Server file not found:', serverPath);
      reject(new Error('Server file not found'));
      return;
    }

    // Spawn server process
    serverProcess = spawn('node', [serverPath], {
      cwd: path.join(resourcesPath, 'server'),
      env: {
        ...process.env,
        PORT: SERVER_PORT.toString(),
        NODE_ENV: 'production',
        // Use app data directory for database
        DATABASE_PATH: path.join(app.getPath('userData'), 'database.sqlite')
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    serverProcess.stdout?.on('data', (data) => {
      console.log(`[Server] ${data}`);
      // Check if server is ready
      if (data.toString().includes('Server started') || data.toString().includes('listening')) {
        resolve();
      }
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error(`[Server Error] ${data}`);
    });

    serverProcess.on('error', (error) => {
      console.error('Failed to start server:', error);
      reject(error);
    });

    serverProcess.on('exit', (code) => {
      console.log(`Server process exited with code ${code}`);
      if (code !== 0 && code !== null) {
        // Restart server on unexpected exit
        setTimeout(() => {
          if (!app.isQuitting) {
            startServer().catch(console.error);
          }
        }, 1000);
      }
    });

    // Set timeout for server start
    setTimeout(() => {
      resolve(); // Resolve anyway after timeout
    }, 5000);
  });
}

/**
 * Wait for server to be ready
 */
async function waitForServer(): Promise<void> {
  const maxAttempts = 30;
  const delay = 1000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://${SERVER_HOST}:${SERVER_PORT}/api/health`);
      if (response.ok) {
        console.log('Server is ready');
        return;
      }
    } catch (error) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error('Server failed to start');
}

/**
 * Create the main application window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'SyntexLegger - Kế toán Doanh nghiệp',
    icon: path.join(resourcesPath, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    show: false,
    backgroundColor: '#f8fafc'
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL(`http://${SERVER_HOST}:${SERVER_PORT}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`http://${SERVER_HOST}:${SERVER_PORT}`);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/**
 * Create splash screen
 */
function createSplashScreen(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
          border-radius: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .container {
          text-align: center;
          color: white;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 16px;
        }
        h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        p {
          margin: 8px 0 24px;
          opacity: 0.9;
          font-size: 14px;
        }
        .loader {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">📊</div>
        <h1>SyntexLegger</h1>
        <p>Kế toán Doanh nghiệp</p>
        <div class="loader"></div>
      </div>
    </body>
    </html>
  `;

  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);

  return splash;
}

// IPC Handlers
ipcMain.handle('get-machine-id', async () => {
  return getMachineId();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  return dialog.showOpenDialog(mainWindow!, options);
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  return dialog.showSaveDialog(mainWindow!, options);
});

ipcMain.handle('show-message-box', async (event, options) => {
  return dialog.showMessageBox(mainWindow!, options);
});

// App lifecycle
app.on('ready', async () => {
  // Show splash screen
  const splash = createSplashScreen();

  try {
    // Start server
    await startServer();
    await waitForServer();

    // Create main window
    createWindow();

    // Close splash when main window is ready
    mainWindow?.once('ready-to-show', () => {
      splash.destroy();
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    dialog.showErrorBox(
      'Lỗi khởi động',
      'Không thể khởi động ứng dụng. Vui lòng thử lại hoặc liên hệ hỗ trợ.'
    );
    splash.destroy();
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  (app as any).isQuitting = true;
});

app.on('quit', () => {
  // Kill server process
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  dialog.showErrorBox('Lỗi', error.message);
});
