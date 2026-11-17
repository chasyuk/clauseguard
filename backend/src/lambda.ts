import serverlessHttp from 'serverless-http';
import { createApp } from './index.js';

const app = createApp();

const rawHandler = serverlessHttp(app, {
  binary: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
});

export const handler = async (event: any, context: any) => {
  const stage = event?.requestContext?.stage;
  if (stage && stage !== '$default') {
    const prefix = `/${stage}`;
    if (typeof event.rawPath === 'string' && event.rawPath.startsWith(prefix)) {
      event.rawPath = event.rawPath.slice(prefix.length) || '/';
    }
    if (
      event.requestContext?.http &&
      typeof event.requestContext.http.path === 'string' &&
      event.requestContext.http.path.startsWith(prefix)
    ) {
      event.requestContext.http.path = event.requestContext.http.path.slice(prefix.length) || '/';
    }
  }
  return rawHandler(event, context);
};
