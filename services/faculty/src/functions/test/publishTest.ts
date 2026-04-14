





import { facultyTestService } from "../../modules/test/test.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";





export const handlerFun = async (event: any) => {

    try {

        const question = await facultyTestService.publishTest(event);

        return handleResponse.success(question, "Test published successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error publishing test", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
