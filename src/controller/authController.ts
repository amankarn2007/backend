import type { Request, Response } from "express";
import { createUserSchema, loginSchema } from "../utils/types.js";
import prismaClient from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto"
import { email } from "zod";


// normal register func, validate schema, hash password and save in db
export async function register(req: Request, res: Response) {
    const parsedResult = createUserSchema.safeParse(req.body);

    if(!parsedResult.success) {
        return res.status(400).json({
            message: "Something is missing",
            error: parsedResult.error
        })
    }

    try {
        const { username, email, password } = parsedResult.data;

        const isAlreadyRegistered = await prismaClient.user.findUnique({
            where: {
                email
            }
        })

        if(isAlreadyRegistered) {
            res.status(400).json({
                message: "User already exists with this email",
                
            })
        }

        const salt = await bcrypt.genSalt(5);
        const hash = await bcrypt.hash(password, salt);

        const user = await prismaClient.user.create({
            data: {
                username,
                email,
                password: hash,
                verified: false
            }
        })

        res.status(201).json({
            message: "User created successfully",
            user: {
                username: user.username,
                email: user.email,
                verified: user.verified
            }
        })

    } catch (err) {
        console.log(err);
        res.json({
            message: "error in register endpoint",
            err
        })
    }
}



// compare hashed pass, 
export async function login(req: Request, res: Response) {
    const parsedResult = loginSchema.safeParse(req.body);

    if(!parsedResult.success) {
        return res.status(400).json({
            message: "Something is missing",
            error: parsedResult.error
        })
    }
    
    try {
        const { email, password } = parsedResult.data;
        const user = await prismaClient.user.findUnique({
            where: {
                email
            }
        })

        if(!user){
            return res.status(401).json({
                message: "Invalid email or password"
            })
        }

        const result = await bcrypt.compare(password, user.password);
        if(!result) {
            return res.status(401).json({
                message: "Wrong password"
            })
        }

        // refreshToken only used to create accessToken(every 15 min)
        const refreshToken = await jwt.sign({
            id: user.id
        }, process.env.JWT_SECRET!, {
            expiresIn: "7d"
        })

        // Store only the hash in DB — plain token never persisted
        const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        const session = await prismaClient.session.create({ //creating session, help in Logout/revoke
            data: {
                userId: user.id,
                refreshTokenHash,
                ip: req.ip ?? "unknown", //can be unknow
                userAgent: req.headers[ "user-agent" ] ?? "unknown",
            }
        })

        // Sign access token (short-lived, tied to sessionId for revocation)
        const accessToken = await jwt.sign({
            id: user.id, // help us to get user details 
            sessionId: session.id, // help us to check user is revoked or not
        }, process.env.JWT_SECRET!, {
            expiresIn: "15m"
        })

        // Refresh token sent via HttpOnly cookie — inaccessible to JS
        res.cookie("refreshToken", refreshToken, { //plain refreshToken, 
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })


        res.status(200).json({ //accessToken in body
            message: "Loged in successfully",
            user: {
                username: user.username,
                email: user.email
            },
            accessToken
        })

    } catch(err) {
        res.status(500).json({
            message: "Internal server error",
            error: err
        })
    }
}

interface JwtPayload {
    id: string,
    sessionId: string
}

export async function getMe(req: Request, res: Response) {
    const token = req.headers.authorization?.split(" ")[1];
    //console.log(token);
    if(!token) {
        return res.status(400).json({
            message: "token not found"
        })
    }

    const decode = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    //console.log(decode)

    //we saved user.id in jwt token on login time
    const user = await prismaClient.user.findFirst({
        where: {
            id: decode.id
        }
    })

    res.status(200).json({
        message: "User fetched successfully",
        user: {
            username: user?.username,
            email: user?.email
        }
    })
}

// this will create new accessToken
export async function refreshToken(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;

    if(!refreshToken) {
        return res.json({
            message: "token not found"
        })
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as JwtPayload;

    const accessToken = await jwt.sign({
        id: decoded.id,
    }, process.env.JWT_SECRET!, {
        expiresIn: "15m"
    })

    //for extra security we'll also create new refreshToken
    const newRefreshToken = await jwt.sign({
        id: decoded.id,
    }, process.env.JWT_SECRET!, {
        expiresIn: "7d"
    })

    //set refreshToken in cookies
    res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.status(200).json({
        message: "Access token refreshed successfully",
        accessToken
    })

}

export async function logout() {
    
}

export async function logoutAll() {
    
}

export async function verifyEmail() {

}