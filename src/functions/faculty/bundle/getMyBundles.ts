





import { bundleService } from "../../../modules/faculty/bundle/bundle.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../middleware/auth/auth";
import { compose } from "../../../shared/compose";
import { handleResponse } from "../../../shared/utils/response";




// get my bundles 

export const handlerFun = async (event: any) => {

    try {


        const bundles = await bundleService.getMyBundles(event);

        return handleResponse.success(bundles, "Bundles fetched successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error fetching bundles", 400);
    }
};


// call start from here

export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);