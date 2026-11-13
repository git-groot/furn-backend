import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware';
import { validate } from '../middlewares/validation.middleware';
import { loginSchema, refreshSchema, registerSchema } from '../validators/auth.validator';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  authController.register.bind(authController),
);

router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  authController.login.bind(authController),
);

router.post('/refresh', validate(refreshSchema), authController.refresh.bind(authController));

router.post('/logout', authController.logout.bind(authController));

router.get('/me', authenticate, authController.getMe.bind(authController));

export default router;
