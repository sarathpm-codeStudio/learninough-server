



import { facultyTestService } from "../../modules/test/test.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";





export const handlerFun = async (event: any) => {

    try {

        const testAnalytics = await facultyTestService.getTestAnalytics(event);

        return handleResponse.success(testAnalytics, "Test analytic successfully fetched", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error fetching test analytics", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
