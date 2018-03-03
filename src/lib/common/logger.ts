const moment = require('moment');
const config = require('config');
import * as fs from 'fs';

// 准备日志
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf, colorize } = format;
timestamp();
const logDir = 'log';
// 如果目录不存在
if (!fs.existsSync(logDir)) {
  // 创建日志目录
  fs.mkdirSync(logDir);
}

const tsFormat = () => moment().format();
const myFormat = printf((info: any) => {
  return `${info.timestamp} [${info.level}] ${info.message}`;
});
let myTransports = [
  // 将输出着色到控制台
  new transports.File({
    filename: `${logDir}/error.log`,
    level: 'error',
  }),
  new transports.File({
    filename: `${logDir}/combined.log`,
    level: 'info',
  }),
  new transports.Console({
    format: combine(colorize(), myFormat),
    level: 'info',
  }),
];

if (config.log.debug) {
  myTransports = myTransports.concat([
    new transports.File({
      filename: `${logDir}/debug.log`,
      level: 'debug',
    }),
    new transports.Console({
      format: combine(colorize(), myFormat),
      level: 'debug',
    }),
  ])
}

export const logger = createLogger({
  format: combine(
    label({ label: '' }),
    timestamp({
      format: tsFormat,
    }),
    myFormat,
  ),
  transports: myTransports,
});
