import { config } from './config.js';
import { createApp } from './index.js';

const app = createApp();

app.listen(config.port, () => {
  console.info(`ClauseGuard backend listening on http://localhost:${config.port}`);
});
