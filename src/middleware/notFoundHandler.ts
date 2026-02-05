import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = {
    error: {
      code: 404,
      message: `Route ${req.originalUrl} not found`,
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  };

  res.status(404).json(error);
};