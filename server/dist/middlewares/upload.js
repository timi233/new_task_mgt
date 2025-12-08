"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_DIR_PATH = exports.followUpUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads');
// 确保上传目录存在
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// 验证 workOrderId 格式（cuid 格式：字母数字，长度约25）
const isValidId = (id) => {
    return /^[a-z0-9]{20,30}$/i.test(id);
};
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const workOrderId = req.params.id;
        // 防止路径遍历攻击
        if (!workOrderId || !isValidId(workOrderId)) {
            return cb(new Error('无效的工单ID'), '');
        }
        const dir = path_1.default.join(UPLOAD_DIR, 'follow-ups', workOrderId);
        fs_1.default.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        // 只允许安全的扩展名
        const safeExt = ext.match(/^\.[a-z0-9]{1,10}$/) ? ext : '';
        cb(null, `${crypto_1.default.randomUUID()}${safeExt}`);
    },
});
const fileFilter = (req, file, cb) => {
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
    }
    else {
        cb(new Error('不支持的文件类型'));
    }
};
exports.followUpUpload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 9 },
    fileFilter,
});
exports.UPLOAD_DIR_PATH = UPLOAD_DIR;
//# sourceMappingURL=upload.js.map