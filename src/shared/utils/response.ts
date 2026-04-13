


// response.ts
export const handleResponse = {

    success: (data: any, message: string = 'Success', status: number = 200) => ({
        statusCode: status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*', // for CORS
        },
        body: JSON.stringify({
            status,
            message,
            data,
        }),
    }),

    error: (error: any, message: string = 'Error', status: number = 500) => {
        console.log('Error:', message, error);
        return {
            statusCode: status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                status,
                message,
                error: process.env.NODE_ENV === 'production'
                    ? 'Internal Server Error'
                    : error?.message || error,
            }),
        };
    },

};