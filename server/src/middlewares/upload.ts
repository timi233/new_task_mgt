import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 验证 workOrderId 格式（cuid 格式：字母数字，长度约25）
const isValidId = (id: string): boolean => {
  return /^[a-z0-9]{20,30}$/i.test(id);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const workOrderId = req.params.id;
    // 防止路径遍历攻击
    if (!workOrderId || !isValidId(workOrderId)) {
      return cb(new Error('无效的工单ID'), '');
    }
    const dir = path.join(UPLOAD_DIR, 'follow-ups', workOrderId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // 修复中文文件名乱码：Multer 使用 latin1 解析，需转为 UTF-8
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    // 在文件名后添加日期后缀：filename_YYYYMMDD.ext
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    file.originalname = `${baseName}_${dateStr}${ext}`;
    // 只允许安全的扩展名
    const safeExt = ext.toLowerCase().match(/^\.[a-z0-9]{1,10}$/) ? ext.toLowerCase() : '';
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', 'application/x-zip-compressed',
    'application/x-rar-compressed', 'application/vnd.rar',
    'application/x-7z-compressed',
    'application/gzip', 'application/x-tar',
    'text/plain', 'text/csv',
    'application/json', 'application/xml', 'text/xml',
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'));
  }
};

export const followUpUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 9 },
  fileFilter,
});

export const UPLOAD_DIR_PATH = UPLOAD_DIR;
