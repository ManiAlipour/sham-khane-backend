import type {
  Request,
  Response,
  NextFunction,
} from "express-serve-static-core";

interface ErrorResponse {
  message: string;
  stack?: string;
  statusCode: number;
}

class AppError extends Error {
  statusCode: number;
  status: "fail" | "error";

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const error: ErrorResponse = {
    message: err.message || "Server Error",
    statusCode: "statusCode" in err ? err.statusCode : 500,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  };

  res.status(error.statusCode).json({
    success: false,
    error: error.message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};

export { errorHandler, AppError };
