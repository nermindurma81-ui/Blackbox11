module.exports = {
  apps: [
    {
      name: 'blackbox-max',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      exp_backoff_restart_delay: 200,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
