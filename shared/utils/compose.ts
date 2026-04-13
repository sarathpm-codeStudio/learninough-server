// compose.ts — chain middlewares cleanly
export const compose = (...middlewares: any[]) => (handler: any): any => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
};
