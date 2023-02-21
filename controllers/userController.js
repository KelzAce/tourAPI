const User = require("../models/User");
const catchAsync = require("../utils/catchAsync");

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    status: "success",
    data: {
      users,
    },
  });
});

exports.getUser = async (req, res, next) => {};

exports.createUser = async (req, res, next) => {};

exports.updateUser = async (req, res, next) => {};

exports.deleteUser = async (req, res, next) => {};
