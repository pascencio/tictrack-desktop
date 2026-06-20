import { isTauri } from '@tauri-apps/api/core';
import { debug, error, info, trace, warn } from '@tauri-apps/plugin-log';

type ConsoleFn = 'log' | 'debug' | 'info' | 'warn' | 'error';

function formatArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.stack ?? arg.message;
      }
      if (typeof arg === 'string') {
        return arg;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ');
}

function forwardConsole(fnName: ConsoleFn, logger: (message: string) => Promise<void>) {
  const original = console[fnName].bind(console);

  console[fnName] = (...args: unknown[]) => {
    original(...args);
    logger(formatArgs(args)).catch(() => {});
  };
}

export default defineNuxtPlugin(() => {
  if (!isTauri()) {
    return;
  }

  forwardConsole('log', trace);
  forwardConsole('debug', debug);
  forwardConsole('info', info);
  forwardConsole('warn', warn);
  forwardConsole('error', error);
});
