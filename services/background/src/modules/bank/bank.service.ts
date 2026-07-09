

import { bankRepository } from "./bank.repository";
import { parseJsonBody } from "../../../../../shared/utils/parseBody";
import { validate } from "../../../../../shared/utils/validate";
import { saveBankDetailsSchema } from "../../../../../shared/validators/bank.schema";



export const bankService = {

    saveBankDetails: async (event: any) => {
        try {
            const validatedData = validate(saveBankDetailsSchema, parseJsonBody(event));
            const bankDetails = await bankRepository.saveBankDetails(validatedData, event.user.id, event.supabase);
            return true;
        }
        catch (error: any) {
            console.log("error", error);
            throw new Error(error);
        }
    },

    getBankDetails: async (event: any) => {
        try {
            const bankDetails = await bankRepository.getBankDetails(event.user.id, event.supabase);
            return bankDetails;
        }
        catch (error: any) {
            console.log("error", error);
            throw new Error(error);
        }
    }
}
