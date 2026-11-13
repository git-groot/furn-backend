/**
 * Masks credentials in PostgreSQL connection strings or logs to prevent sensitive leaks.
 */
export const maskConnectionString = (connectionString?: string): string => {
  if (!connectionString) return '[undefined]';
  try {
    const url = new URL(connectionString);
    if (url.password) {
      url.password = '********';
    }
    if (url.username) {
      url.username = url.username.slice(0, 3) + '***';
    }
    return url.toString();
  } catch {
    // If not a standard URL, mask password-like patterns
    return connectionString.replace(/:([^@/:]+)@/, ':********@');
  }
};

