const User = require("../models/user-model");
const Post = require("../models/post-model");
const Comment = require("../models/comment-model");
const cloudinary = require("../config/cloudinary");
const mongoose = require("mongoose");
const {
  firstFormValue,
  parseMultipartForm,
  removeTemporaryFiles,
} = require("../utils/multipart-form");
const logError = require("../utils/log-error");

exports.addPost = async (req, res) => {
  let files = {};
  let uploadedImage;
  let createdPost;
  try {
    const parsedForm = await parseMultipartForm(req);
    files = parsedForm.files;
    const text = firstFormValue(parsedForm.fields.text)?.trim();
    const media = firstFormValue(files.media);
    if ((text && text.length > 2000) || (!text && !media)) {
      return res
        .status(400)
        .json({ msg: "A post needs text or an image; text is limited to 2000 characters !" });
    }

    if (media) {
      uploadedImage = await cloudinary.uploader.upload(media.filepath, {
        folder: "Threads_clone/Posts",
        resource_type: "image",
      });
    }

    createdPost = await Post.create({
      admin: req.user._id,
      ...(text ? { text } : {}),
      ...(uploadedImage
        ? { media: uploadedImage.secure_url, public_id: uploadedImage.public_id }
        : {}),
    });
    const userUpdate = await User.updateOne(
      { _id: req.user._id },
      { $addToSet: { threads: createdPost._id } }
    );
    if (userUpdate.matchedCount !== 1) {
      throw new Error("Post owner no longer exists.");
    }
    return res.status(201).json({ msg: "Post created !", newPost: createdPost });
  } catch (err) {
    if (createdPost) {
      const rollbackResults = await Promise.allSettled([
        Post.deleteOne({ _id: createdPost._id }),
        User.updateOne(
          { _id: req.user._id },
          { $pull: { threads: createdPost._id } }
        ),
      ]);
      if (rollbackResults.some((result) => result.status === "rejected")) {
        console.error("Failed to fully roll back an unsuccessful post creation.");
      }
    }
    if (uploadedImage?.public_id) {
      try {
        await cloudinary.uploader.destroy(uploadedImage.public_id);
      } catch {
        console.error("Failed to clean up an uploaded post image.");
      }
    }
    if (![413, 415].includes(err.status)) {
      logError("Post creation failed", err);
    }
    const status = [413, 415].includes(err.status) ? err.status : 500;
    return res.status(status).json({
      msg:
        err.status === 413
          ? "Image exceeds the 5 MB upload limit !"
          : err.status === 415
            ? "Upload one supported image file only !"
            : "Error creating post; check image upload configuration and try again !",
    });
  } finally {
    try {
      await removeTemporaryFiles(files);
    } catch (err) {
      console.error("Failed to clean up a temporary post upload.");
    }
  }
};

exports.allPost = async (req, res) => {
  try {
    const pageNumber = Number(req.query.page || 1);
    if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || pageNumber > 100000) {
      return res
        .status(400)
        .json({ msg: "Page must be an integer between 1 and 100000 !" });
    }
    const posts = await Post.find({})
      .sort({ createdAt: -1, _id: -1 })
      .skip((pageNumber - 1) * 3)
      .limit(3)
      .populate({ path: "admin", select: "userName profilePic" })
      .populate({ path: "likes", select: "userName profilePic" })
      .populate({
        path: "comments",
        populate: {
          path: "admin",
          model: "user",
          select: "userName profilePic",
        },
      });
    res.status(200).json({ msg: "Post Fetched !", posts });
  } catch (err) {
    logError("Post feed fetch failed", err);
    res.status(500).json({ msg: "Error fetching posts !" });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ msg: "A valid post id is required !" });
    }
    const postExists = await Post.findById(id);
    if (!postExists) {
      return res.status(404).json({ msg: "Post not found !" });
    }
    const userId = req.user._id.toString();
    const adminId = postExists.admin.toString();
    if (userId !== adminId) {
      return res
        .status(403)
        .json({ msg: "You are not authorized to delete this post !" });
    }
    await Comment.deleteMany({ _id: { $in: postExists.comments } });
    const commentIds = postExists.comments;
    await User.updateMany(
      {
        $or: [
          { threads: id },
          { reposts: id },
          ...(commentIds.length ? [{ replies: { $in: commentIds } }] : []),
        ],
      },
      {
        $pull: {
          threads: id,
          reposts: id,
          ...(commentIds.length ? { replies: { $in: commentIds } } : {}),
        },
      }
    );
    await Post.findByIdAndDelete(id);
    if (postExists.media && postExists.public_id) {
      try {
        await cloudinary.uploader.destroy(postExists.public_id);
      } catch {
        console.error("Failed to clean up a deleted post image.");
      }
    }
    res.status(200).json({ msg: "Post deleted !" });
  } catch (err) {
    logError("Post deletion failed", err);
    res.status(500).json({ msg: "Error deleting post !" });
  }
};

exports.likePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ msg: "A valid post id is required !" });
    }
    const unlikedPost = await Post.findOneAndUpdate(
      { _id: id, likes: req.user._id },
      { $pull: { likes: req.user._id } },
      { new: true }
    );
    if (unlikedPost) {
      return res.status(200).json({ msg: "Post unliked !" });
    }
    const likedPost = await Post.findOneAndUpdate(
      { _id: id, likes: { $ne: req.user._id } },
      { $addToSet: { likes: req.user._id } },
      { new: true }
    );
    if (!likedPost) {
      const postExists = await Post.exists({ _id: id });
      return res
        .status(postExists ? 200 : 404)
        .json({ msg: postExists ? "Post already updated !" : "Post not found !" });
    }
    return res.status(200).json({ msg: "Post liked !" });
  } catch (err) {
    logError("Post like update failed", err);
    res.status(500).json({ msg: "Error updating post like !" });
  }
};

exports.repost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ msg: "A valid post id is required !" });
    }
    const post = await Post.findById(id).select("_id");
    if (!post) {
      return res.status(404).json({ msg: "Post not found !" });
    }
    const user = await User.findOneAndUpdate(
      { _id: req.user._id, reposts: { $ne: post._id } },
      { $addToSet: { reposts: post._id } },
      { new: true }
    );
    if (!user) {
      return res.status(409).json({ msg: "This post is already reposted !" });
    }
    res.status(201).json({ msg: "Reposted !" });
  } catch (err) {
    logError("Post repost failed", err);
    res.status(500).json({ msg: "Error reposting post !" });
  }
};

exports.singlePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ msg: "A valid post id is required !" });
    }
    const post = await Post.findById(id)
      .populate({
        path: "admin",
        select: "userName profilePic bio",
      })
      .populate({ path: "likes", select: "userName profilePic" })
      .populate({
        path: "comments",
        populate: {
          path: "admin",
          select: "userName profilePic",
        },
      });
    if (!post) {
      return res.status(404).json({ msg: "Post not found !" });
    }
    res.status(200).json({ msg: "Post Fetched !", post });
  } catch (err) {
    logError("Single post fetch failed", err);
    res.status(500).json({ msg: "Error fetching post !" });
  }
};
