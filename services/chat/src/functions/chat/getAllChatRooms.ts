







import { chatService } from "../../modules/chat.service";
import { verifyAuth, verifyAccountStatus } from "../../../../../shared/utils/verifyAuth";
import { compose } from "../../../../../shared/utils/compose";
import { handleResponse } from "../../../../../shared/utils/response";


export const handlerFun = async (event: any) => {

    try {

        const result = await chatService.getAllMyChatRooms(event);

        return handleResponse.success(result, "All chat rooms fetched successfully", 200);


    } catch (err: any) {

        return handleResponse.error(err, "Error getting all chat rooms", 400);
    }
};


export const handler = compose(
    verifyAuth,
    verifyAccountStatus
)(handlerFun);
