
import { chatRepository } from "./chat.repository"
import { validate } from "../../../../shared/utils/validate";
import { sendMessageSchema } from "../../../../shared/validators/chat.validator";




export const chatService = {



    setOnline: async (event: any) => {

        try {

            const data = JSON.parse(event.body)

            const result = await chatRepository.setOnline(event.user.id, data.platform)

            return result


        } catch (error: any) {

            throw new Error(error.message)

        }

    },

    setOffline: async (event: any) => {

        try {

            const result = await chatRepository.setOffline(event.user.id)

            return result


        } catch (error: any) {

            throw new Error(error.message)

        }

    },

    getPresence: async (event: any) => {

        try {

            const userId = event.pathParameters.userId

            const result = await chatRepository.getPresence(userId)

            return result


        } catch (error: any) {

            throw new Error(error.message)

        }

    },

    // ─── start chat ─────────────────────────────

    startChat: async (event: any) => {

        try {

            const data = JSON.parse(event.body)

            const passingData = {
                userId: event.user.id,
                role: event.user.role,
            }

            const result = await chatRepository.startChat(passingData, data.receiverId)

            return result

        } catch (error: any) {

            throw new Error(error.message)
        }

    },

    // ─── send message ─────────────────────────────

    sendMessage: async (event: any) => {

        try {


            const validatedData = validate(sendMessageSchema, JSON.parse(event.body));

            const result = await chatRepository.sendMessage(validatedData, event.user.id)

            return result

        } catch (error: any) {

            throw new Error(error.message)
        }

    },

    // ─── Mark message as delivered ─────────────

    markDelivered: async (event: any) => {
        try {
            const { messageId } = event.pathParameters;
            const receiverId = event.user.id;

            const result = await chatRepository.markDelivered(messageId, receiverId);

            return result;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    // ─── Mark message as seen ─────────────

    markSeen: async (event: any) => {
        try {
            const { messageId } = event.pathParameters;
            const receiverId = event.user.id;

            const result = await chatRepository.markSeen(messageId, receiverId);

            return result;

        } catch (error: any) {
            throw new Error(error.message);
        }
    },

    getAllMyChatRooms: async (event: any) => {
        try {
            const userId = event.user.id;
            const result = await chatRepository.getAllMyChatRooms(userId);
            return result;

        } catch (error: any) {

            throw new Error(error.message);
        }
    },




}