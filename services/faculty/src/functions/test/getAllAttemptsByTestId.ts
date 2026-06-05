


import { facultyTestService } from "../../modules/test/test.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";





export const handlerFun = async (event: any) => {

    try {

        const test = await facultyTestService.getAllAttemptsByTestId(event);

        return handleResponse.success(test, "All attempts by test id fetched successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error fetching all attempts by test id", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
