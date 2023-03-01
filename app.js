const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const tourRouter = require("./routes/tourRoute");
const userRouter = require("./routes/userRoute");
const reviewRouter = require("./routes/reviewRoute");

const app = express();

//MIDDLEWARES
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//GLOBAL RATE LIMIT
//SET SECURITY HTTP HEADERS
app.use(helmet());

//DEVELOPMENT LOGGING
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//LIMIT REQUEST FROM SAME API
const limiter = rateLimit({
  //100 request per hour
  max: 100,
  //1hour
  windowMs: 60 * 60 * 1000,
  message: "Too many request from this IP, please try again in an hour",
});

app.use("/api", limiter);

//BODY PARSER, READING DATA FROM BODY INTO REQ.BODY
app.use(express.json({ limit: "10kb" }));

//DATA SANITIZATION AGAINST NOSQL QUERY INJECTION
app.use(mongoSanitize());

//DATA SANITIZATION AGAINST XSS(CROSS SITE SCRIPTING)
app.use(xss());

//Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  })
);

app.use(express.static(`${__dirname}/public`));

//SERVIN STATIC FILES
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();

  next();
});

//ROUTES
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Cant find ${req.originalUrl} on this server`));
});

app.use(globalErrorHandler);

module.exports = app;
