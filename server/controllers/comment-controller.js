const User = require("../models/user-model");
const Post = require("../models/post-model");
const Comment = require("../models/comment-model");
const mongoose = require("mongoose");
const logError = require("../utils/log-error");

exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ msg: "A valid post id is required !" });
    }
    if (!text || text.length > 2000) {
      return res.status(400).json({ msg: "Comment must be 1 to 2000 characters !" });
    }
    const postExists = await Post.findById(id);
    if (!postExists) {
      return res.status(404).json({ msg: "Post not found !" });
    }
    const comment = new Comment({
      text,
      admin: req.user._id,
      post: postExists._id,
    });
    const newComment = await comment.save();
    try {
      const [updatedPost, updatedUser] = await Promise.all([
        Post.findByIdAndUpdate(
          id,
          { $addToSet: { comments: newComment._id } },
          { new: true }
        ),
        User.findByIdAndUpdate(
          req.user._id,
          { $addToSet: { replies: newComment._id } },
          { new: true }
        ),
      ]);
      if (!updatedPost || !updatedUser) {
        throw new Error("Comment owner or post no longer exists.");
      }
    } catch (error) {
      const rollbackResults = await Promise.allSettled([
        Comment.deleteOne({ _id: newComment._id }),
        Post.updateOne({ _id: id }, { $pull: { comments: newComment._id } }),
        User.updateOne(
          { _id: req.user._id },
          { $pull: { replies: newComment._id } }
        ),
      ]);
      if (rollbackResults.some((result) => result.status === "rejected")) {
        console.error("Failed to fully roll back an unsuccessful comment creation.");
      }
      throw error;
    }
    res.status(201).json({ msg: "Commented !" });
  } catch (err) {
    logError("Comment creation failed", err);
    res.status(500).json({ msg: "Error adding comment !" });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { postId, id } = req.params;
    if (!mongoose.isValidObjectId(postId) || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ msg: "Valid post and comment ids are required !" });
    }
    const postExists = await Post.findById(postId);
    if (!postExists) {
      return res.status(404).json({ msg: "Post not found !" });
    }
    const commentExists = await Comment.findById(id);
    if (!commentExists) {
      return res.status(404).json({ msg: "Comment not found !" });
    }
    if (!commentExists.post.equals(postExists._id)) {
      return res.status(404).json({ msg: "Comment not found on this post !" });
    }
    {
      const id1 = commentExists.admin.toString();
      const id2 = req.user._id.toString();
      if (id1 !== id2) {
        return res
          .status(403)
          .json({ msg: "You are not authorized to delete the comment !" });
      }
      await Post.findByIdAndUpdate(
        postId,
        {
          $pull: { comments: id },
        },
        { new: true }
      );
      await User.findByIdAndUpdate(
        req.user._id,
        {
          $pull: { replies: id },
        },
        { new: true }
      );
      await Comment.findByIdAndDelete(id);
      return res.status(200).json({ msg: "Comment deleted !" });
    }
  } catch (err) {
    logError("Comment deletion failed", err);
    res.status(500).json({ msg: "Error deleting comment !" });
  }
};
