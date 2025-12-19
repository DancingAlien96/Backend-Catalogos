import * as client from 'prom-client';

export const cartAddsCounter = new client.Counter({ name: 'telegram_cart_add_total', help: 'Total cart additions' });
export const ordersCounter = new client.Counter({ name: 'telegram_orders_total', help: 'Total orders created' });
export const botErrorsCounter = new client.Counter({ name: 'telegram_bot_errors_total', help: 'Total bot errors' });
export const activeSessionsGauge = new client.Gauge({ name: 'telegram_active_sessions', help: 'Active sessions in Redis' });

// AI queue metrics
export const aiJobsAdded = new client.Counter({ name: 'ai_jobs_added_total', help: 'Total AI jobs added to queue' });
export const aiJobsCompleted = new client.Counter({ name: 'ai_jobs_completed_total', help: 'Total AI jobs completed successfully' });
export const aiJobsFailed = new client.Counter({ name: 'ai_jobs_failed_total', help: 'Total AI jobs failed' });

export default client;
