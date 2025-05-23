// /home/digilab/timesheet/server/middleware/errorMiddleware.js

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);

  console.error("Global Error Handler Caught:", {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '' : err.stack, 
    url: req.originalUrl,
    method: req.method,
  });

  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack, 
  });
};

export { errorHandler };