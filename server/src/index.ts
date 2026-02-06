/**
 * Server Entry Point
 * Starts the Express server with TypeScript support
 */

import { createApp } from './app';
import { checkConnection, closeConnection } from './db';

const PORT = process.env.PORT || 3000;

async function startServer(): Promise<void> {
  // Check database connection
  const dbConnected = await checkConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }

  // Create Express app
  const app = createApp();

  // Start server
  const server = app.listen(PORT, () => {
    console.log('');
    console.log('   ╔═══════════════════════════════════════════╗');
    console.log('   ║     SyntexLegger Backend Server (TS)      ║');
    console.log('   ╠═══════════════════════════════════════════╣');
    console.log(`   ║  Port: ${PORT}                               ║`);
    console.log(`   ║  Environment: ${process.env.NODE_ENV || 'development'}              ║`);
    console.log('   ║  Status: Running                          ║');
    console.log('   ╚═══════════════════════════════════════════╝');
    console.log('');
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    server.close(async () => {
      console.log('HTTP server closed.');

      try {
        await closeConnection();
        console.log('Database connection closed.');
      } catch (error) {
        console.error('Error closing database:', error);
      }

      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
