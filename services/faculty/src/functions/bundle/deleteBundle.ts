

import { bundleService } from "../../modules/bundle/bundle.service";
import { verifyAuth, verifyRole, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const bundle = await bundleService.deleteBundle(event);

        return handleResponse.success(bundle, "Bundle deleted successfully", 200);

    } catch (err: any) {

        return handleResponse.error(err, "Error deleting bundle", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyRole("FACULTY"),
    verifyAccountStatus
)(handlerFun);
