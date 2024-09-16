export const errorMiddleware = (err, req, res, next) => {
    console.log("here", err);
    err.message || (err.message = "");
    return res.status(err.statusCode).json({
        success: false,
        message: err.message
    });
};
export const TryCatch = (func) => async (req, res, next) => {
    Promise.resolve(func(req, res, next)).catch((err) => next(err));
};
