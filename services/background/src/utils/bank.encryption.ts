


import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.BANK_ENCRYPTION_KEY!;
const ALGORITHM      = 'aes-256-gcm';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error('BANK_ENCRYPTION_KEY must be exactly 32 characters');
}

export const encrypt = (plainText: string): string => {
    const iv        = crypto.randomBytes(16);
    const cipher    = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag   = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

export const decrypt = (encryptedText: string): string => {
    const buffer    = Buffer.from(encryptedText, 'base64');
    const iv        = buffer.subarray(0, 16);
    const authTag   = buffer.subarray(16, 32);
    const encrypted = buffer.subarray(32);
    const decipher  = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};