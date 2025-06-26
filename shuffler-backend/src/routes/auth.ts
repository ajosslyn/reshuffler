import express from 'express';
import { 
  registerUser, 
  loginUser, 
  exchangeToken, 
  refreshAccessToken 
} from '../controllers/authController';

const router = express.Router();

// Routes
router.post('/token', exchangeToken);
router.post('/refresh', refreshAccessToken);
router.post('/register', registerUser);
router.post('/login', loginUser);

export default router;