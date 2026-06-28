import { Client } from 'appwrite';
import { conf } from './conf/conf';

/**
 * Shared Appwrite Client — Single Instance.
 *
 * Previously every service class (Auth, Cart, Products, Orders, etc.) created
 * its own `new Client()` instance, resulting in 15+ separate connections.
 * Each client maintains its own WebSocket connection for realtime, its own
 * session tracking, and its own memory footprint.
 *
 * This singleton is imported by all services instead, reducing overhead
 * to a single connection for the entire app.
 */
export const client = new Client()
  .setEndpoint(conf.appwriteurl)
  .setProject(conf.appwriteProjectId);
