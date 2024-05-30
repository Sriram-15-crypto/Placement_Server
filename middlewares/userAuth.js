const User_Access = require("../models/AddUserModal");
const config = require("config");
const JWT_TOKEN_KEY= config.get("JWT_TOKEN_KEY");
const jwt = require("jsonwebtoken");

module.exports.userAuth= (req, res, next) => {
  const token = req.cookies.token
  if (!token) {
    return res.status(500).json({ message: [{ key: 'error', value: 'User is not logged in' }] })
  }

  //FIXME: redirect to login page when status is failed
  jwt.verify(token, JWT_TOKEN_KEY, async (err, data) => {
    if (err) {
      res.clearCookie("token")
      return res.status(500).json({ message: [{ key: 'error', value: 'User is not logged in' }] })
    } else {
      const user = await User_Access.findById(data.id)
      if (user){
        req.user = user
        next();
      }
      
      else {
        res.clearCookie("token")
        return res.status(500).json({ message: [{ key: 'error', value: 'User is not logged in' }] })
      }
    }
  })
}
