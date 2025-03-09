import type {
  Request,
  Response,
  NextFunction,
} from "express-serve-static-core";
import jwt from "jsonwebtoken";
import { AppError } from "./error.middleware";
import User from "../models/user.model";
import { IUser } from "../types/models";

interface JwtPayload {
  id: string;
}

interface AuthenticatedRequest extends Request {
  user: IUser;
}

const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new AppError("Not authorized to access this route", 401));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    return next(new AppError("Not authorized to access this route", 401));
  }
};

const authorize = (...roles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError(
          `User role ${
            req.user?.role || "unknown"
          } is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

export { protect, authorize, AuthenticatedRequest };
