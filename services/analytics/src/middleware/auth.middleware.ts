import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  // In production, validate JWT token here
  // For now, we'll pass through
  next();
};

export const adminOnly = (req: Request, res: Response, next: NextFunction): void => {
  // In production, check user role from JWT
  // For now, we'll pass through
  next();
};
