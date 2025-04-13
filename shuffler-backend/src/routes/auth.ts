import express from 'express';
import * as authController from '../controllers/authController';
const { registerUser, loginUser } = authController;

const router = express.Router();

// Route for user registration
router.post('/register', registerUser);

// Route for user login
router.post('/login', loginUser);

export default router;