



import { bundleService } from "../../../modules/faculty/bundle/bundle.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";




// create course with basic details 

export const handlerFun = async (event: any) => {

    try {


        const bundle = await bundleService.createCourseBundle(event);

        if (bundle.is_draft) {
            return handleResponse.success(bundle, "Bundle save to draft successfully", 200);

        } else {

            return handleResponse.success(bundle, "Bundle publishedi successfully", 200);

        }

    } catch (err: any) {

        return handleResponse.error(err, "Error creating bundle", 400);
    }
};


// call start from here

export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);