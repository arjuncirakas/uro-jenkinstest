module.exports = {
  apps: [
    {
      name: 'uroprep-backend-dev',
      script: './server.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
        FRONTEND_URL: 'http://localhost:5173,http://localhost:3000'
      },
      error_file: './logs/backend-error-dev.log',
      out_file: './logs/backend-out-dev.log',
      log_file: './logs/backend-combined-dev.log',
      time: true,
      max_memory_restart: '500M',
      watch: true, // Auto-reload on file changes
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: true,
      shutdown_with_message: true,
      // Node.js flags
      node_args: '--max-old-space-size=512',
      // Environment file
      env_file: './backend/secure.env'
    }
  ]
};

