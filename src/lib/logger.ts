export default interface Logger {
  error(...args: any[]): void;
  log(...args: any[]): void;
  warn(...args: any[]): void;
  debug(...args: any[]): void;
}
