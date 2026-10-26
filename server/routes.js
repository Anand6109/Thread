const express = require("express");
const { rateLimit } = require("express-rate-limit");
const {
  signin,
  login,
  userDetails,
  followUser,
  pendingFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  updateProfile,
  searchUser,
  logout,
  myInfo,
} = require("./controllers/user-controller");
const auth = require("./middleware/auth");
const {
  addPost,
  allPost,
  deletePost,
  likePost,
  repost,
  singlePost,
} = require("./controllers/post-controller");
const {
  addComment,
  deleteComment,
} = require("./controllers/comment-controller");

const router = express.Router();
const authenticationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: "Too many authentication attempts; try again later !" },
});
const searchRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: "Too many searches; try again later !" },
});

router.post("/signin", authenticationRateLimit, signin);
router.post("/login", authenticationRateLimit, login);

router.get("/user/:id", auth, userDetails);
router.put("/user/follow/:id", auth, followUser);
router.get("/follow-requests", auth, pendingFollowRequests);
router.put("/follow-requests/:id/accept", auth, acceptFollowRequest);
router.delete("/follow-requests/:id", auth, rejectFollowRequest);
router.put("/update", auth, updateProfile);
router.get("/users/search/:query", auth, searchRateLimit, searchUser);
router.post("/logout", auth, logout);
router.get("/me", auth, myInfo);

router.post("/post", auth, addPost);
router.get("/post", auth, allPost);
router.delete("/post/:id", auth, deletePost);
router.put("/post/like/:id", auth, likePost);
router.put("/repost/:id", auth, repost);
router.get("/post/:id", auth, singlePost);

router.post("/comment/:id", auth, addComment);
router.delete("/comment/:postId/:id", auth, deleteComment);

module.exports = router;
