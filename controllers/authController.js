const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const sendEmail = require("../utils/email");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user: user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) if email and password exist

  if (!email || !password) {
    return next(new AppError("please provide email and password!", 400));
  }

  //2) check if the user exist and the passwod is correct
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect Email or password", 401));
  }

  //3) if everything is ok, send the token
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1) Getting the Token and check if it exist
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged In, please log in to get access", 401)
    );
  }

  //2) Verify the Token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3) Check if user still exist
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to the token does no longer exist", 401)
    );
  }

  //4) Check if user changed password after the token was issued
  if (currentUser.passwordChangedAt(decoded.iat)) {
    return next(
      new AppError("User recently changed password!, please log in again", 401)
    );
  }

  //grants access to protected route
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles is an array ['admin' and 'lead-guide']. role = user
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with that email address", 404));
  }

  //2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();

  //ValidateBeforeSave: deactivate all the valid datas in the schema
  await user.save({ validateBeforeSave: false });

  //3) Send it to users email
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/resetPassword/${resetToken}}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and 
  passwordConfirm to: ${resetURL}.\n if you didnt forget your password, please ingnore this email `;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your Password Reset Token (valid for 10mins)",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email, please try again later",
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) get user based on token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  //find user with the token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    //check if token hasnt expired
    passwordResetExpires: { $gt: Date.now() },
  });

  //2) if the token hasnt expired, and there is a new user, set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  //3) update changedPasswordAt property for the user
  //4) log the user in, send JWT
  createSendToken(user, 200, res);
  const token = signToken(user._id);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get the user from the collection
  const user = await User.findById(req.user.id).select("+password");

  //2) Check if the password is correct
  if (await !user.correctPassword(req.body.passwordCurrent, user.password)) {
    return next(new AppError("Your current password is wrong", 401));
  }
  //3) if so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //4) log user in, send JWT
  createSendToken(user, 200, res);
});
