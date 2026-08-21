// ============================================================
// STRUCTURED LOGGING CONFIGURATION
// ============================================================
// Provides consistent logging across the application
// with proper log levels, timestamps, and contextual info
// ============================================================

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const LOG_LEVEL_NAMES = Object.keys(LOG_LEVELS).reverse();
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase() || 'INFO'];

/**
 * Format log message with timestamp and metadata
 */
function formatLog(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...metadata,
  };

  return JSON.stringify(logEntry);
}

/**
 * Log at specified level
 */
function log(level, message, metadata = {}) {
  const levelValue = LOG_LEVELS[level];

  if (levelValue > currentLogLevel) {
    return;
  }

  const formattedLog = formatLog(level, message, metadata);

  if (level === 'ERROR') {
    console.error(formattedLog);
  } else if (level === 'WARN') {
    console.warn(formattedLog);
  } else {
    console.log(formattedLog);
  }

  // Write to file in production
  if (process.env.NODE_ENV === 'production') {
    const logFile = path.join(logsDir, `${level.toLowerCase()}.log`);
    try {
      fs.appendFileSync(logFile, formattedLog + '\n');
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }
}

const logger = {
  error: (msg, meta) => log('ERROR', msg, meta),
  warn: (msg, meta) => log('WARN', msg, meta),
  info: (msg, meta) => log('INFO', msg, meta),
  debug: (msg, meta) => log('DEBUG', msg, meta),
};

module.exports = logger;
