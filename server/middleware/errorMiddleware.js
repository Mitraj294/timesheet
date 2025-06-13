// /home/digilab/timesheet/server/middleware/errorMiddleware.js

const errorHandler = (err, req, res, next) => {
  // Use 500 if no error status set
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);

  // Log error details (hide stack in production)
  console.error("Error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? "" : err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Send error response (hide stack in production)
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export { errorHandler };
