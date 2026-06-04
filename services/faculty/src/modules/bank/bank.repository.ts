
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase as anonSupabase } from "../../../../../shared/config/supabase";
import { encrypt, decrypt } from "../../utils/bank.encryption";
import { SaveBankDetailsInput } from "../../../../../shared/validators/bank.schema";

const maskValue = (value: string, visibleChars: number = 4): string => {
    if (value.length <= visibleChars) return value;
    const masked  = '*'.repeat(value.length - visibleChars);
    const visible = value.slice(-visibleChars);
    return masked + visible;
};



export const bankRepository = {


    // ── SAVE ─────────────────────────────────────────────────────────
    saveBankDetails: async (
       data:      Omit<SaveBankDetailsInput, 'confirm_account_number'>,
        facultyId: string,
        client?:   SupabaseClient
    ) => {
        try {
            const db = client ?? anonSupabase;

            const encryptedAccount = encrypt(data.account_number);
            const encryptedPan     = encrypt(data.pan_number);

            const { data: saved, error } = await db
                .from('faculty_bank_details')
                .upsert({
                    faculty_id:          facultyId,
                    bank_name:           data.bank_name,
                    account_holder_name: data.account_holder_name,
                    ifsc_code:           data.ifsc_code,
                    account_number:      encryptedAccount,
                    pan_number:          encryptedPan,
                    is_verified:         false,
                })
                .select('id, faculty_id, bank_name, account_holder_name, ifsc_code, is_verified, created_at')
                .single();

            if (error) throw new Error(error.message);
            return saved;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    // ── GET (masked) ──────────────────────────────────────────────────
    getBankDetails: async (
        facultyId: string,
        client?:   SupabaseClient
    ) => {
        try {

            const db = client ?? anonSupabase;

            const { data, error } = await db
                .from('faculty_bank_details')
                .select('*')
                .eq('faculty_id', facultyId)
                .eq('is_deleted', false)
                .maybeSingle();

            if (error) throw new Error(error.message);
            if (!data)  return null;

            const decryptedAccount = decrypt(data.account_number);
            const decryptedPan     = decrypt(data.pan_number);

            return {
                id:                  data.id,
                faculty_id:          data.faculty_id,
                bank_name:           data.bank_name,
                account_holder_name: data.account_holder_name,
                ifsc_code:           data.ifsc_code,
                is_verified:         data.is_verified,
                verified_at:         data.verified_at,
                is_active:           data.is_active,
                created_at:          data.created_at,
                updated_at:          data.updated_at,

                // ✅ Masked for frontend display
                account_number: maskValue(decryptedAccount, 4), // "******7890"
                pan_number:     maskValue(decryptedPan,     4), // "*******234F"
            };

        } catch (error: any) {
            throw new Error(error.message);
        }
    },
}