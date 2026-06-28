-- 初始管理员账号 (密码：123456, 使用 BCrypt 加密)
-- 注意：实际生产环境中应该通过注册接口创建用户，密码会自动加密
INSERT INTO t_user (id, username, password, role, avatar, create_time, update_time, deleted)
VALUES ('2001523723396308993', 'admin', '$2a$10$AP/6DyX2jii8GNnzUOSRU.3C6CJJQA5PBFOVNUNmuVSkEsHrOTUeu', 'admin', 'https://static.deepseek.com/user-avatar/G_6cuD8GbD53VwGRwisvCsZ6', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);