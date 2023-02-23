const User = require("../models/User");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const filteredObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    status: "success",
    data: {
      users,
    },
  });
});

//UPDATE DONE BY A LOGGED IN USER
exports.updateMe = async (req, res, next) => {
  //1) Create an error if user post password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMypassword",
        400
      )
    );
  }

  //fitered out unwated field names that are not allowed to be updated
  const filteredBody = filterObj(req.body, "name", "email");

  //2) Update user doc.
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "Success",
    data: {
      user: updatedUser,
    },
  });
};

//USER DELETING THIER ACCOUNT => THIER DETAILS DOESNT GET DELETED FROM THE DB, THEY ARE JUST
// SET TO INACTIVE
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndDelete(req.user.id, { active: false });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.getUser = async (req, res, next) => {};

exports.createUser = async (req, res, next) => {};

//UPDATE BY ADMINISTRATION
exports.updateUser = async (req, res, next) => {};

exports.deleteUser = async (req, res, next) => {};
