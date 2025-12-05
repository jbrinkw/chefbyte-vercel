import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/db-supabase';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

export const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({ message: 'Invalid token format' });
            return;
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.log('Auth failed:', error?.message);
            res.status(401).json({ message: 'Invalid or expired token' });
            return;
        }

        console.log('Auth success for user:', user.id);
        req.userId = user.id;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ message: 'Internal server error during authentication' });
    }
};
