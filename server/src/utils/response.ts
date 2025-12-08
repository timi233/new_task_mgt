import { Response } from 'express';

interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export const success = <T>(res: Response, data: T, message: string = 'success') => {
  const response: ApiResponse<T> = {
    code: 0,
    message,
    data,
  };
  return res.json(response);
};

export const paginate = <T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  message: string = 'success'
) => {
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

export const fail = (res: Response, message: string, code: number = 1005, statusCode: number = 400) => {
  return res.status(statusCode).json({
    code,
    message,
    data: null,
  });
};
