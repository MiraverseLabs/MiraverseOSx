import base from './playwright.config';
export default {
  ...base, outputDir: process.env.TEMP + '/miraverse-pilot-review', reporter: 'list',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4184' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4184 --strictPort', url: 'http://127.0.0.1:4184', timeout: 120000 },
};
