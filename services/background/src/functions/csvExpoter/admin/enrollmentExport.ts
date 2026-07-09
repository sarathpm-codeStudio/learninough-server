import { adminEnrollmentCsvService } from "../../../modules/csvExpoter/admin/enrollment.service";
import { verifyAuth, verifyRole } from "../../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../../shared/utils/response";
import { xlsxResponse } from "../../../utils/xlsx";


export const handlerFun = async (event: any) => {

    try {

        const { buffer, filename } = await adminEnrollmentCsvService.exportCourseEnrollments(event);

        return xlsxResponse(buffer, filename);

    } catch (err: any) {

        return handleResponse.error(err, "Error exporting course enrollments", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("ADMIN")
)(handlerFun);
