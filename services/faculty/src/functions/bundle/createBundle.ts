import { bundleService } from "../../modules/bundle/bundle.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const bundle = await bundleService.createCourseBundle(event);

        if (bundle.is_draft) {
            return handleResponse.success(bundle, "Bundle save to draft successfully", 200);

        } else {

            return handleResponse.success(bundle, "Bundle published successfully", 200);

        }

    } catch (err: any) {

        return handleResponse.error(err, "Error creating bundle", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
