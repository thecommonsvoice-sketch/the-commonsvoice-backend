export const checkUser = async (req, res, next) => {
    try {
        const user = req.user;
        console.log("req user check user:", user);
        next();
    }
    catch (error) {
        console.error("Authentication error:", error);
    }
};
