import { bundleService } from "../../modules/bundle/bundle.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const bundles = await bundleService.updateBundle(event);

        return handleResponse.success(bundles, "Bundle updated successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error updating bundle", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
