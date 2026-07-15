import { facultyQuestionImportService } from "../../../modules/csvExpoter/faculty/question.service";
import { verifyAuth, verifyRole } from "../../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const result = await facultyQuestionImportService.importTestQuestions(event);

        return handleResponse.success(result, "Questions imported successfully");

    } catch (err: any) {

        return handleResponse.error(err, "Error importing questions", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY")
)(handlerFun);
