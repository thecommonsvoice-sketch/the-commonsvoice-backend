export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export function getCookieOptions(type = "access") {
    const isProd = process.env.NODE_ENV === "production";

    const base = {
        httpOnly: true,
        secure: isProd ? true : false,
        sameSite: isProd ? "none" : "lax",
        path: "/",
    };

    if (type === "refresh") {
        return { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 }; // 7 days
    }

    // Access token cookie — matches JWT expiry of 1 day
    return { ...base, maxAge: 1 * 24 * 60 * 60 * 1000 }; // 1 day
}
