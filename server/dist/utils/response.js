"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fail = exports.paginate = exports.success = void 0;
const success = (res, data, message = 'success') => {
    const response = {
        code: 0,
        message,
        data,
    };
    return res.json(response);
};
exports.success = success;
const paginate = (res, data, total, page, pageSize, message = 'success') => {
    return res.json({
        code: 0,
        message,
        data: {
            list: data,
            pagination: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize),
            },
        },
    });
};
exports.paginate = paginate;
const fail = (res, message, code = 1005, statusCode = 400) => {
    return res.status(statusCode).json({
        code,
        message,
        data: null,
    });
};
exports.fail = fail;
//# sourceMappingURL=response.js.map