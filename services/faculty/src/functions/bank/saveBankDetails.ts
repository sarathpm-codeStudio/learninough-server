import { bankService } from "../../modules/bank/bank.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const bankDetails = await bankService.saveBankDetails(event);

        return handleResponse.success(bankDetails, "Bank details saved successfully", 200);

    } catch (err: any) {

        return handleResponse.error(err, "Error saving bank details", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
