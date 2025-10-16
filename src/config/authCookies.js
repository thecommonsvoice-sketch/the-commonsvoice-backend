export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
export function getCookieOptions() {
    const isProd = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure: isProd ? true : false,
        sameSite: isProd ? "none" : "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
}
