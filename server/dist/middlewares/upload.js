"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_DIR_PATH = exports.followUpUpload = void 0;
exports.validateFileSignatures = validateFileSignatures;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../utils/logger");
const log = (0, logger_1.createModuleLogger)('upload');
const UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads');
// 确保上传目录存在
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// 文件签名（Magic Number）映射表
const FILE_SIGNATURES = {
    // 图片
    'image/jpeg': [{ signature: [0xFF, 0xD8, 0xFF] }],
    'image/png': [{ signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
    'image/gif': [{ signature: [0x47, 0x49, 0x46, 0x38] }], // GIF8
    'image/webp': [{ signature: [0x52, 0x49, 0x46, 0x46], offset: 0 }, { signature: [0x57, 0x45, 0x42, 0x50], offset: 8 }],
    'image/bmp': [{ signature: [0x42, 0x4D] }], // BM
    // PDF
    'application/pdf': [{ signature: [0x25, 0x50, 0x44, 0x46] }], // %PDF
    // Office 文档 (ZIP-based OOXML)
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [{ signature: [0x50, 0x4B, 0x03, 0x04] }],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [{ signature: [0x50, 0x4B, 0x03, 0x04] }],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': [{ signature: [0x50, 0x4B, 0x03, 0x04] }],
    // 旧版 Office (OLE Compound Document)
    'application/msword': [{ signature: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] }],
    'application/vnd.ms-excel': [{ signature: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] }],
    'application/vnd.ms-powerpoint': [{ signature: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] }],
    // 压缩包
    'application/zip': [{ signature: [0x50, 0x4B, 0x03, 0x04] }],
    'application/x-zip-compressed': [{ signature: [0x50, 0x4B, 0x03, 0x04] }],
    'application/x-rar-compressed': [{ signature: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07] }], // Rar!
    'application/vnd.rar': [{ signature: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07] }],
    'application/x-7z-compressed': [{ signature: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C] }], // 7z
    'application/gzip': [{ signature: [0x1F, 0x8B] }],
};
// 不需要签名校验的文本类型（内容可变）
const TEXT_MIMES = new Set([
    'text/plain', 'text/csv', 'application/json', 'application/xml', 'text/xml',
    'image/svg+xml', 'application/x-tar',
]);
// 验证文件签名
function verifyFileSignature(filePath, mimeType) {
    // 文本类型不校验签名
    if (TEXT_MIMES.has(mimeType)) {
        return true;
    }
    const signatures = FILE_SIGNATURES[mimeType];
    if (!signatures) {
        // 未知类型，允许通过（已通过 MIME 白名单）
        return true;
    }
    try {
        const fd = fs_1.default.openSync(filePath, 'r');
        const buffer = Buffer.alloc(16);
        fs_1.default.readSync(fd, buffer, 0, 16, 0);
        fs_1.default.closeSync(fd);
        // 检查所有签名规则
        for (const rule of signatures) {
            const offset = rule.offset ?? 0;
            let match = true;
            for (let i = 0; i < rule.signature.length; i++) {
                if (buffer[offset + i] !== rule.signature[i]) {
                    match = false;
                    break;
                }
            }
            if (match)
                return true;
        }
        return false;
    }
    catch {
        return false;
    }
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
        // 修复中文文件名乱码：Multer 使用 latin1 解析，需转为 UTF-8
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        // 在文件名后添加日期后缀：filename_YYYYMMDD.ext
        const ext = path_1.default.extname(file.originalname);
        const baseName = path_1.default.basename(file.originalname, ext);
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        file.originalname = `${baseName}_${dateStr}${ext}`;
        // 只允许安全的扩展名
        const safeExt = ext.toLowerCase().match(/^\.[a-z0-9]{1,10}$/) ? ext.toLowerCase() : '';
        cb(null, `${crypto_1.default.randomUUID()}${safeExt}`);
    },
});
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
const fileFilter = (req, file, cb) => {
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
/**
 * 文件签名验证中间件
 * 在 multer 上传后执行，验证文件实际内容与声明的 MIME 类型是否匹配
 */
function validateFileSignatures(req, res, next) {
    const files = req.files;
    if (!files || files.length === 0) {
        return next();
    }
    const invalidFiles = [];
    for (const file of files) {
        if (!verifyFileSignature(file.path, file.mimetype)) {
            invalidFiles.push(file.originalname);
            // 删除不合法的文件
            try {
                fs_1.default.unlinkSync(file.path);
            }
            catch {
                // 忽略删除错误
            }
        }
    }
    if (invalidFiles.length > 0) {
        log.warn('文件签名校验失败', { files: invalidFiles });
        return res.status(400).json({
            code: 1400,
            message: `文件内容与类型不匹配: ${invalidFiles.join(', ')}`,
            data: null,
        });
    }
    next();
}
exports.UPLOAD_DIR_PATH = UPLOAD_DIR;
//# sourceMappingURL=upload.js.map