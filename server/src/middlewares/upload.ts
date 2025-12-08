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
    const ext = path.extname(file.originalname).toLowerCase();
    // 只允许安全的扩展名
    const safeExt = ext.match(/^\.[a-z0-9]{1,10}$/) ? ext : '';
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
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
