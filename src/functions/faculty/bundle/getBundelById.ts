







import { bundleService } from "../../../modules/faculty/bundle/bundle.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";




// get bundle by id 

export const handlerFun = async (event: any) => {

    try {


        const bundle = await bundleService.getBundleById(event);

        return handleResponse.success(bundle, "Bundle fetched successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error fetching bundle", 400);
    }
};


// call start from here

export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);