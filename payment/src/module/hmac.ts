import crypto from "crypto";
import { MBTransaction } from "../types/mbbank";

export const generateHMAC = (payload: MBTransaction) => {
    const secretKey = process.env.HMAC
    if (!secretKey) {
        throw new Error("HMAC secret key is not defined in environment variables.");
    }
    if (!payload) {
        throw new Error("Payload to be hashed is required.");
    }
    
    const data = JSON.stringify(payload);
    return crypto.createHmac("sha256", secretKey).update(data).digest("hex");
}