
import { facultyTestService } from "../../modules/test/test.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";





export const handlerFun = async (event: any) => {

    try {

        const question = await facultyTestService.createTestQuestion(event);

        return handleResponse.success(question, "Test question created successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error creating test question", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
