

import { z } from 'zod';

export const saveBankDetailsSchema = z.object({
    bank_name: z
        .string()
        .min(2, 'Bank name must be at least 2 characters')
        .max(100, 'Bank name too long'),

    account_holder_name: z
        .string()
        .min(2, 'Account holder name must be at least 2 characters')
        .max(100, 'Account holder name too long'),

    account_number: z
        .string()
        .regex(/^[0-9]{9,18}$/, 'Account number must be 9-18 digits only'),

    confirm_account_number: z
        .string()
        .regex(/^[0-9]{9,18}$/, 'Account number must be 9-18 digits only'),

    ifsc_code: z
        .string()
        .toUpperCase()
        .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format (e.g. SBIN0001234)'),

    pan_number: z
        .string()
        .toUpperCase()
        .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g. ABCDE1234F)'),

}).refine(
    (data) => data.account_number === data.confirm_account_number,
    {
        message:  'Account numbers do not match',
        path:     ['confirm_account_number'],
    }
);

export type SaveBankDetailsInput = z.infer<typeof saveBankDetailsSchema>;