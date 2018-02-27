import * as fs from 'fs';

// 准备日志
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const logDir = 'log';
// 如果目录不存在
if (!fs.existsSync(logDir)) {
  // 创建日志目录
  fs.mkdirSync(logDir);
}

const tsFormat = () => Date.now();
const myFormat = printf((info: any) => {
  return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
});

export const logger = createLogger({
  format: combine(label({ label: '' }), timestamp(), myFormat),
  transports: [
    // 将输出着色到控制台
    new transports.File({
      timestamp: tsFormat,
      filename: `${logDir}/error.log`,
      level: 'error',
    }),
    new transports.File({
      timestamp: tsFormat,
      filename: `${logDir}/combined.log`,
      level: 'info',
    }),
    new transports.File({
      filename: `${logDir}/debug.log`,
      timestamp: tsFormat,
      level: 'debug',
    }),
  ],
});
