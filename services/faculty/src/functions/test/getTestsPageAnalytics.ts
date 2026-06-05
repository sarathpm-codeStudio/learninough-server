


import { facultyTestService } from "../../modules/test/test.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";





export const handlerFun = async (event: any) => {

    try {

        const analytics = await facultyTestService.getTestsPageAnalytics(event);

        return handleResponse.success(analytics, "Tests page analytics fetched successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error fetching tests page analytics", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
