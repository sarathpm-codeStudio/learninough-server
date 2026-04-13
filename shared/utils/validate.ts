// src/utils/validate.ts
import { ZodSchema } from "zod";

export const validate = <T>(schema: ZodSchema<T>, data: unknown): T => {
    const result: any = schema.safeParse(data);

    if (!result.success) {
        console.log("result>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", result);
        const errors = result?.error?.errors?.map((e: any) => ({
            field: e.path.join("."),
            message: e.message,
        }));
        throw { statusCode: 400, errors };
    }

    return result.data;
};
