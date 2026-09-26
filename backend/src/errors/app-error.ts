export type AppErrorOptions = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  expose?: boolean;
};

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
    this.expose = options.expose ?? options.statusCode < 500;

    Error.captureStackTrace(this, AppError);
  }
}
