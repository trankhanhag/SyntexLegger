/**
 * PM2 Ecosystem Configuration for SyntexLegger
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 *   pm2 start ecosystem.config.js --env staging
 */

module.exports = {
    apps: [
        {
            name: 'syntexlegger',
            script: '../server/index.js',
            cwd: './server',
            instances: 'max', // Or specific number like 2
            exec_mode: 'cluster',
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',

            // Environment variables
            env: {
                NODE_ENV: 'development',
                PORT: 5000
            },
            env_staging: {
                NODE_ENV: 'staging',
                PORT: 5000
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 5000
            },

            // Logs
            error_file: '../logs/pm2-error.log',
            out_file: '../logs/pm2-out.log',
            log_file: '../logs/pm2-combined.log',
            time: true,

            // Graceful shutdown
            kill_timeout: 5000,
            wait_ready: true,
            listen_timeout: 10000,

            // Restart settings
            exp_backoff_restart_delay: 100,
            max_restarts: 10,
            min_uptime: '10s'
        }
    ],

    // Deployment configuration (optional - for pm2 deploy)
    deploy: {
        production: {
            user: 'deploy',
            host: 'your-server.com',
            ref: 'origin/main',
            repo: 'git@github.com:yourorg/syntexlegger.git',
            path: '/var/www/syntexlegger',
            'pre-deploy': 'git fetch --all',
            'post-deploy': 'cd deploy && ./deploy.sh production && pm2 reload ecosystem.config.js --env production',
            env: {
                NODE_ENV: 'production'
            }
        },
        staging: {
            user: 'deploy',
            host: 'staging.your-server.com',
            ref: 'origin/develop',
            repo: 'git@github.com:yourorg/syntexlegger.git',
            path: '/var/www/syntexlegger-staging',
            'post-deploy': 'cd deploy && ./deploy.sh staging && pm2 reload ecosystem.config.js --env staging',
            env: {
                NODE_ENV: 'staging'
            }
        }
    }
};
