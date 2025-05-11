const { verifyToken } = require('../utils/tokenUtils');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Требуется аутентификация' });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }

  // console.log('Token:', token); // Log the received token
  // console.log('Decoded token:', decoded);  // Log the decoded token (if successful)

  req.user = decoded;
  next();
};

module.exports = authMiddleware;