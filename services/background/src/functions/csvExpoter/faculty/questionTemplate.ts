import { facultyQuestionImportService } from "../../../modules/csvExpoter/faculty/question.service";
import { verifyAuth, verifyRole } from "../../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../../shared/utils/response";
import { xlsxResponse } from "../../../utils/xlsx";


// The template is static — no request data is needed beyond passing the auth middleware.
export const handlerFun = async () => {

    try {

        const { buffer, filename } = await facultyQuestionImportService.buildTemplate();

        return xlsxResponse(buffer, filename);

    } catch (err: any) {

        return handleResponse.error(err, "Error generating the question import template", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY")
)(handlerFun);
