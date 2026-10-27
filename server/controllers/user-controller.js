const User = require("../models/user-model");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");
const {
  firstFormValue,
  parseMultipartForm,
  removeTemporaryFiles,
} = require("../utils/multipart-form");
const logError = require("../utils/log-error");

const isProduction =
  process.env.NODE_ENV === "production" || process.env.RENDER === "true";
const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
};

exports.signin = async (req, res) => {
  try {
    const { userName, password } = req.body;
    const email =
      typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (
      typeof userName !== "string" ||
      !userName.trim() ||
      userName.trim().length > 32 ||
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" ||
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res
        .status(400)
        .json({
          msg: "Use a username of 1-32 characters, a valid email address, and a password of at least 8 characters and at most 72 UTF-8 bytes.",
        });
    }
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .json({ msg: "User is already registerd ! Please Login ." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    if (!hashedPassword) {
      return res.status(400).json({ msg: "Error in password hashing !" });
    }
    const user = new User({
      userName: userName.trim(),
      email,
      password: hashedPassword,
    });
    const result = await user.save();
    if (!result) {
      return res.status(400).json({ msg: "Error while saving user !" });
    }
    const accesToken = jwt.sign(
      { token: result._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d", algorithm: "HS256" }
    );
    if (!accesToken) {
      return res.status(400).json({ msg: "Error while generating token !" });
    }
    res.cookie("token", accesToken, {
      ...authCookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
    res
      .status(201)
      .json({ msg: `User Signed in successfully ! hello ${result?.userName}` });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ msg: "An account with this email already exists !" });
    }
    logError("Account creation failed", err);
    res.status(500).json({ msg: "Error creating account !" });
  }
};

exports.login = async (req, res) => {
  try {
    const email =
      typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const { password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password are required !" });
    }
    const userExists = await User.findOne({ email }).select("+password");
    if (!userExists || typeof password !== "string") {
      return res.status(401).json({ msg: "Incorrect email or password !" });
    }
    const passwordMatched = await bcrypt.compare(password, userExists.password);
    if (!passwordMatched) {
      return res.status(401).json({ msg: "Incorrect email or password !" });
    }
    const accessToken = jwt.sign(
      { token: userExists._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d", algorithm: "HS256" }
    );
    if (!accessToken) {
      return res.status(400).json({ msg: "Token not gemnerated in login !" });
    }
    res.cookie("token", accessToken, {
      ...authCookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
    res.status(200).json({ msg: "User logged in succcessfully !" });
  } catch (err) {
    logError("Login failed", err);
    res.status(500).json({ msg: "Error logging in !" });
  }
};

exports.userDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ msg: "A valid user id is required !" });
    }
    const [user, isFollowing, isFollowRequestPending] = await Promise.all([
      User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(id) } },
        {
          $project: {
            userName: 1,
            profilePic: 1,
            bio: 1,
            threads: 1,
            replies: 1,
            reposts: 1,
            followersCount: {
              $size: { $ifNull: ["$followers", []] },
            },
          },
        },
      ]).then(([profile]) =>
        profile
          ? User.populate(profile, [
              {
                path: "threads",
                populate: [
                  { path: "likes", select: "userName profilePic" },
                  {
                    path: "comments",
                    populate: { path: "admin", select: "userName profilePic" },
                  },
                  { path: "admin", select: "userName profilePic" },
                ],
              },
              {
                path: "replies",
                populate: { path: "admin", select: "userName profilePic" },
              },
              {
                path: "reposts",
                populate: [
                  { path: "likes", select: "userName profilePic" },
                  {
                    path: "comments",
                    populate: { path: "admin", select: "userName profilePic" },
                  },
                  { path: "admin", select: "userName profilePic" },
                ],
              },
            ])
          : null
      ),
      User.exists({ _id: id, followers: req.user._id }),
      User.exists({ _id: id, pendingFollowRequests: req.user._id }),
    ]);
    if (!user) {
      return res.status(404).json({ msg: "User not found !" });
    }
    res.status(200).json({
      msg: "User Details Fetched !",
      user: {
        ...user,
        isFollowing: Boolean(isFollowing),
        isFollowRequestPending: Boolean(isFollowRequestPending),
      },
    });
  } catch (err) {
    logError("User profile fetch failed", err);
    res.status(500).json({ msg: "Error fetching user details !" });
  }
};

exports.followUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ msg: "A valid user id is required !" });
    }
    if (id === req.user._id.toString()) {
      return res.status(400).json({ msg: "You cannot follow yourself !" });
    }

    const existingFollow = await User.findOneAndUpdate(
      { _id: id, followers: req.user._id },
      { $pull: { followers: req.user._id } },
      { new: true }
    );
    if (existingFollow) {
      return res.status(200).json({ msg: `Unfollowed ${existingFollow.userName}` });
    }

    const existingRequest = await User.findOneAndUpdate(
      { _id: id, pendingFollowRequests: req.user._id },
      { $pull: { pendingFollowRequests: req.user._id } },
      { new: true }
    );
    if (existingRequest) {
      return res.status(200).json({ msg: "Follow request cancelled !" });
    }

    const request = await User.findOneAndUpdate(
      {
        _id: id,
        followers: { $ne: req.user._id },
        pendingFollowRequests: { $ne: req.user._id },
      },
      { $addToSet: { pendingFollowRequests: req.user._id } },
      { new: true }
    );
    if (!request) {
      const userExists = await User.exists({ _id: id });
      if (!userExists) {
        return res.status(404).json({ msg: "User not found !" });
      }
      return res.status(409).json({ msg: "Follow request is already processed !" });
    }
    return res.status(201).json({ msg: `Follow request sent to ${request.userName}` });
  } catch (err) {
    logError("Follow update failed", err);
    res.status(500).json({ msg: "Error in followUser !" });
  }
};

exports.pendingFollowRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("+pendingFollowRequests")
      .populate({
        path: "pendingFollowRequests",
        select: "userName profilePic bio",
      });
    if (!user) {
      return res.status(404).json({ msg: "User not found !" });
    }
    res.status(200).json({
      requests: user.pendingFollowRequests.filter(Boolean),
    });
  } catch (err) {
    logError("Pending follow request fetch failed", err);
    res.status(500).json({ msg: "Error fetching follow requests !" });
  }
};

exports.acceptFollowRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ msg: "A valid user id is required !" });
    }
    if (id === req.user._id.toString()) {
      return res.status(400).json({ msg: "You cannot accept your own request !" });
    }

    const recipient = await User.findOneAndUpdate(
      { _id: req.user._id, pendingFollowRequests: id },
      {
        $pull: { pendingFollowRequests: id },
        $addToSet: { followers: id },
      },
      { new: true }
    );
    if (!recipient) {
      return res.status(404).json({ msg: "Pending follow request not found !" });
    }

    res.status(200).json({ msg: "Follow request accepted !", requesterId: id });
  } catch (err) {
    logError("Follow request acceptance failed", err);
    res.status(500).json({ msg: "Error accepting follow request !" });
  }
};

exports.rejectFollowRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ msg: "A valid user id is required !" });
    }
    if (id === req.user._id.toString()) {
      return res.status(400).json({ msg: "You cannot reject your own request !" });
    }

    const recipient = await User.findOneAndUpdate(
      { _id: req.user._id, pendingFollowRequests: id },
      { $pull: { pendingFollowRequests: id } },
      { new: true }
    );
    if (!recipient) {
      return res.status(404).json({ msg: "Pending follow request not found !" });
    }

    res.status(200).json({ msg: "Follow request rejected !", requesterId: id });
  } catch (err) {
    logError("Follow request rejection failed", err);
    res.status(500).json({ msg: "Error rejecting follow request !" });
  }
};

exports.updateProfile = async (req, res) => {
  let files = {};
  let uploadedImage;
  try {
    const parsedForm = await parseMultipartForm(req);
    files = parsedForm.files;
    const text = firstFormValue(parsedForm.fields.text);
    const media = firstFormValue(files.media);
    if (text === undefined && !media) {
      return res.status(400).json({ msg: "Provide a bio or profile image to update !" });
    }

    if (text !== undefined && typeof text !== "string") {
      return res.status(400).json({ msg: "Bio must be text !" });
    }
    if (typeof text === "string" && text.length > 500) {
      return res.status(400).json({ msg: "Bio must be 500 characters or fewer !" });
    }

    const userExists = await User.findById(req.user._id).select("public_id");
    if (!userExists) {
      return res.status(404).json({ msg: "User not found !" });
    }

    const changes = {};
    if (typeof text === "string") {
      changes.bio = text;
    }
    if (media) {
      uploadedImage = await cloudinary.uploader.upload(media.filepath, {
        folder: "Threads_clone/Profiles",
        resource_type: "image",
      });
      changes.profilePic = uploadedImage.secure_url;
      changes.public_id = uploadedImage.public_id;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: changes },
      { new: true }
    );
    if (!updatedUser) {
      throw new Error("Profile update failed.");
    }
    if (uploadedImage && userExists.public_id) {
      try {
        await cloudinary.uploader.destroy(userExists.public_id);
      } catch {
        console.error("Failed to clean up the previous profile image.");
      }
    }
    return res.status(200).json({ msg: "Profile updated successfully !" });
  } catch (err) {
    if (uploadedImage?.public_id) {
      try {
        await cloudinary.uploader.destroy(uploadedImage.public_id);
      } catch {
        console.error("Failed to clean up a new profile image after update failure.");
      }
    }
    if (![413, 415].includes(err.status)) {
      logError("Profile update failed", err);
    }
    return res.status(err.status === 413 ? 413 : err.status === 415 ? 415 : 500).json({
      msg:
        err.status === 413
          ? "Image exceeds the 5 MB upload limit !"
          : err.status === 415
            ? "Upload one image file only !"
            : "Error updating profile; check image upload configuration and try again !",
    });
  } finally {
    try {
      await removeTemporaryFiles(files);
    } catch {
      console.error("Failed to clean up a temporary profile upload.");
    }
  }
};

exports.searchUser = async (req, res) => {
  try {
    const { query } = req.params;
    const normalizedQuery = query.trim();
    if (!normalizedQuery || normalizedQuery.length > 64) {
      return res.status(400).json({ msg: "Search query must be 1 to 64 characters !" });
    }
    const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const users = await User.aggregate([
      {
        $match: {
          $or: [
            { userName: { $regex: escapedQuery, $options: "i" } },
            { email: { $regex: escapedQuery, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          userName: 1,
          profilePic: 1,
          bio: 1,
          followersCount: { $size: { $ifNull: ["$followers", []] } },
        },
      },
      { $limit: 25 },
    ]);
    res.status(200).json({ msg: "Searched !", users });
  } catch (err) {
    logError("User search failed", err);
    res.status(500).json({ msg: "Error searching users !" });
  }
};

exports.logout = async (req, res) => {
  try {
    res.cookie("token", "", {
      ...authCookieOptions,
      maxAge: 0,
    });

    res.status(201).json({ msg: `You have been logged out! ${req.user.userName}` });
  } catch (err) {
    logError("Logout failed", err);
    res.status(400).json({ msg: "Error in logout" });
  }
};

exports.myInfo = async (req, res) => {
  res.status(200).json({
    me: {
      _id: req.user._id,
      userName: req.user.userName,
      email: req.user.email,
      bio: req.user.bio,
      profilePic: req.user.profilePic,
    },
  });
};
