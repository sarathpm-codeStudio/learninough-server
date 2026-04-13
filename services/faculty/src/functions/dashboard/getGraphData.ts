import { facultyDashboardService } from "../../modules/dashboard/dashboard.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        return handleResponse.success({}, "Graph data fetched successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error fetching graph data", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
