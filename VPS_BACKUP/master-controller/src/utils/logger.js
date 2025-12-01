/**
 * Winston Logger Configuration
 * Provides structured logging with multiple transports
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure log directory exists
const logDir = path.dirname(config.logging.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format for better readability
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }

    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: customFormat,
  transports: [
    // Console transport (for development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: config.logging.logFile,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),

    // Separate file for errors
    new winston.transports.File({
      filename: config.logging.errorLogFile,
      level: 'error',
      maxsize: 10485760,
      maxFiles: 5,
      tailable: true
    })
  ],

  // Handle exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log')
    })
  ],

  // Handle rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log')
    })
  ]
});

// Create child loggers for different modules
logger.module = (moduleName) => {
  return logger.child({ module: moduleName });
};

// Helper methods for common log patterns
logger.vmLog = (vmId, message, metadata = {}) => {
  logger.info(message, { vmId, ...metadata });
};

logger.userLog = (userId, message, metadata = {}) => {
  logger.info(message, { userId, ...metadata });
};

logger.apiLog = (method, path, status, duration, metadata = {}) => {
  logger.info(`${method} ${path} ${status}`, { duration, ...metadata });
};

logger.metricLog = (metric, value, metadata = {}) => {
  logger.debug(`Metric: ${metric}`, { value, ...metadata });
};

module.exports = logger;
