// PM2 process file (used on the VPS): keeps the site running and restarts it on crashes/reboots.
module.exports = {
  apps: [{
    name: 'babysteps',
    script: 'src/index.js',
    cwd: __dirname,
    instances: 1,
    max_memory_restart: '400M',
    env_production: { NODE_ENV: 'production' },
    time: true,
  }],
};
