// PM2 Ecosystem Configuration
// PM2 ile uygulama yönetimi için

module.exports = {
  apps: [
    {
      name: 'siparis-backend',
      script: './backend/dist/index.js',
      cwd: '/var/www/siparis-takip',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/www/siparis-takip/logs/backend-error.log',
      out_file: '/var/www/siparis-takip/logs/backend-out.log',
      log_file: '/var/www/siparis-takip/logs/backend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};

