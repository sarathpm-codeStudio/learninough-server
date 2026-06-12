

import { bankRepository } from "./bank.repository";
import { validate } from "../../../../../shared/utils/validate";
import { saveBankDetailsSchema } from "../../../../../shared/validators/bank.schema";



export const bankService = {

    saveBankDetails: async (event: any) => {
        try {
            const validatedData = validate(saveBankDetailsSchema, JSON.parse(event.body));
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
