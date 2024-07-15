export default interface Logger {
    error(...args: any[]): void;
    log(...args: any[]): void;
}
