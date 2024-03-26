async function logoutMiddleware(req, res) {
  const refreshToken = req.cookies.jwt;
  if (!refreshToken) {
    return res.status(403).json('Not Authorized');
  }
  try {
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
    return res.status(200).json('Logout successful');
  } catch (error) {
    console.error(error.message);
    return res.status(403).json('Not Authorized');
  }
}

module.exports = logoutMiddleware;
