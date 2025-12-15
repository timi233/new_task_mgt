
## 2025-12-09

### 修复
- **附件下载认证失败问题**：后端 `authenticate` 中间件支持从 URL query 参数 `?token=xxx` 获取 token，解决直接访问附件链接时无法携带 Authorization header 的问题
- **中文文件名乱码问题**：Multer 上传时将 `originalname` 从 latin1 转换为 UTF-8 编码

### 新增
- **文件名日期后缀**：上传文件自动添加 `_YYYYMMDD` 后缀，如 `报告.xlsx` → `报告_20251209.xlsx`

### 数据修正
- 修正数据库中乱码文件名 `æºæä½ç½®å¾.xlsx` → `任丘机柜位置图_20251209.xlsx`
