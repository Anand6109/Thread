const User = require("../models/user-model");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const auth = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ msg: "No token in auth !" });
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch {
    return res.status(401).json({ msg: "Authentication failed !" });
  }

  if (
    typeof decodedToken?.token !== "string" ||
    !mongoose.isValidObjectId(decodedToken.token)
  ) {
    return res.status(401).json({ msg: "Authentication failed !" });
  }

  try {
    const user = await User.findById(decodedToken.token).select(
      "_id userName email bio profilePic"
    );
    if (!user) {
      return res.status(401).json({ msg: "No user found !" });
    }
    req.user = user;
  } catch (err) {
    return next(err);
  }
  return next();
};

module.exports = auth;
