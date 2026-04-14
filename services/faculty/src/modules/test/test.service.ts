

import { facultyTestRepository } from "./test.repository"
import { createTestBaseDetailsSchema, createTestQuestionSchema } from "../../../../../shared/validators/test.validator"
import { validate } from "../../../../../shared/utils/validate"




export const facultyTestService = {

    createTestBaseDetails: async (event: any) => {
        try {

            const validatedData: any = validate(createTestBaseDetailsSchema, JSON.parse(event.body));

            const result = await facultyTestRepository.createTestBaseDetails(validatedData, event.user.id);

            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getMyAllTests: async (event: any) => {
        try {

            const { filter, page, limit, search } = event.queryStringParameters;

            const result = await facultyTestRepository.getMyAllTests(
                event.user.id,
                filter,
                page,
                limit,
                search);

            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    getTestById: async (event: any) => {
        try {

            const result = await facultyTestRepository.getTestById(event.pathParameters.testId);

            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    updateTest: async (event: any) => {
        try {

            const result = await facultyTestRepository.updateTest(event.pathParameters.testId, event.body, event.user.id);

            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    deleteTest: async (event: any) => {
        try {

            const result = await facultyTestRepository.deleteTest(event.pathParameters.testId);

            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    createTestQuestion: async (event: any) => {
        try {

            const validatedData: any = validate(createTestQuestionSchema, JSON.parse(event.body));

            const result = await facultyTestRepository.createTestQuestion(validatedData, event.pathParameters.testId);

            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    updateTestQuestion: async (event: any) => {
        try {

            const validatedData: any = validate(createTestQuestionSchema, JSON.parse(event.body));

            const result = await facultyTestRepository.updateTestQuestion(validatedData, event.pathParameters.testId);

            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    deleteTestQuestion: async (event: any) => {
        try {

            const result = await facultyTestRepository.deleteTestQuestion(event.pathParameters.questionId);

            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },

    publishTest: async (event: any) => {
        try {

            const result = await facultyTestRepository.publishTest(event.pathParameters.testId);

            return result;

        } catch (error: any) {

            console.log("error", error);

            throw new Error(error)
        }
    },



}