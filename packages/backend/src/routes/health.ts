import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

const COMMIT = process.env.GIT_COMMIT ?? "dev";

router.get('/health', async (_request: Request, response: Response) => {
    response.json({ status: "ok", commit: COMMIT });
});

export default router;
