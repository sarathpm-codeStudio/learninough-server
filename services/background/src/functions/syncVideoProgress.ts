import { handleResponse } from "../../../../shared/utils/response";


export const handler = async (event: any) => {

    try {

        // TODO: implement video progress sync logic

    } catch (err: any) {

        return handleResponse.error(err, "Error syncing video progress", 400);

    }
};
