-- =============================================
-- Synapse OS - Demo Seed Data (模拟数据)
-- =============================================
-- 在执行 schema.sql 之后运行此脚本
-- =============================================

-- 1. 创建测试餐厅
INSERT INTO restaurants (id, name, address, phone, email)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Synapse 智慧餐厅',
  '上海市浦东新区张江高科技园区 AI 大厦 1 楼',
  '021-88888888',
  'contact@synapse-restaurant.com'
);

-- 2. 创建菜单分类
INSERT INTO menu_categories (id, restaurant_id, name, sort_order) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '🔥 热门推荐', 1),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '🍲 特色川菜', 2),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '🥗 健康轻食', 3),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '🍜 主食面点', 4),
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '🥤 饮品甜点', 5);

-- 3. 创建菜品 - 热门推荐
INSERT INTO menu_items (category_id, name, description, price, is_available, is_featured, prep_time_minutes) VALUES
('10000000-0000-0000-0000-000000000001', '招牌宫保鸡丁', '经典川菜，鸡肉嫩滑，花生酥脆，微辣回甜', 48.00, true, true, 12),
('10000000-0000-0000-0000-000000000001', '蒜蓉粉丝蒸扇贝', '新鲜扇贝配粉丝，蒜香浓郁', 68.00, true, true, 15),
('10000000-0000-0000-0000-000000000001', '黑松露和牛粒', '澳洲M5和牛搭配意大利黑松露', 188.00, true, true, 18);

-- 4. 创建菜品 - 特色川菜
INSERT INTO menu_items (category_id, name, description, price, is_available, is_featured, prep_time_minutes) VALUES
('10000000-0000-0000-0000-000000000002', '水煮牛肉', '麻辣鲜香，牛肉滑嫩', 68.00, true, false, 15),
('10000000-0000-0000-0000-000000000002', '麻婆豆腐', '麻辣烫香，入口即化', 38.00, true, false, 10),
('10000000-0000-0000-0000-000000000002', '回锅肉', '肥而不腻，香气四溢', 48.00, true, false, 12),
('10000000-0000-0000-0000-000000000002', '鱼香肉丝', '酸甜微辣，下饭神器', 42.00, true, false, 10);

-- 5. 创建菜品 - 健康轻食
INSERT INTO menu_items (category_id, name, description, price, is_available, is_featured, prep_time_minutes) VALUES
('10000000-0000-0000-0000-000000000003', '凯撒沙拉', '新鲜罗马生菜配帕玛森芝士', 38.00, true, false, 5),
('10000000-0000-0000-0000-000000000003', '牛油果鸡肉沙拉', '低脂高蛋白健康之选', 48.00, true, false, 8),
('10000000-0000-0000-0000-000000000003', '时令蔬菜拼盘', '本地有机时蔬', 32.00, true, false, 5);

-- 6. 创建菜品 - 主食面点
INSERT INTO menu_items (category_id, name, description, price, is_available, is_featured, prep_time_minutes) VALUES
('10000000-0000-0000-0000-000000000004', '扬州炒饭', '经典蛋炒饭，粒粒分明', 28.00, true, false, 8),
('10000000-0000-0000-0000-000000000004', '担担面', '正宗成都风味', 32.00, true, false, 10),
('10000000-0000-0000-0000-000000000004', '兰州拉面', '手工现拉，劲道爽滑', 35.00, true, false, 12),
('10000000-0000-0000-0000-000000000004', '小笼包 (8个)', '皮薄馅大，汤汁鲜美', 38.00, true, false, 15);

-- 7. 创建菜品 - 饮品甜点
INSERT INTO menu_items (category_id, name, description, price, is_available, is_featured, prep_time_minutes) VALUES
('10000000-0000-0000-0000-000000000005', '鲜榨橙汁', '每日新鲜压榨', 22.00, true, false, 3),
('10000000-0000-0000-0000-000000000005', '冰美式咖啡', '精选阿拉比卡豆', 28.00, true, false, 3),
('10000000-0000-0000-0000-000000000005', '芒果班戟', '新鲜芒果配奶油', 32.00, true, false, 5),
('10000000-0000-0000-0000-000000000005', '提拉米苏', '经典意式甜点', 38.00, true, false, 2);

-- 8. 创建餐桌
INSERT INTO tables (restaurant_id, table_number, capacity, status, section) VALUES
('00000000-0000-0000-0000-000000000001', 'A1', 2, 'available', 'A区-窗边'),
('00000000-0000-0000-0000-000000000001', 'A2', 2, 'occupied', 'A区-窗边'),
('00000000-0000-0000-0000-000000000001', 'A3', 4, 'available', 'A区-窗边'),
('00000000-0000-0000-0000-000000000001', 'B1', 4, 'occupied', 'B区-中央'),
('00000000-0000-0000-0000-000000000001', 'B2', 4, 'reserved', 'B区-中央'),
('00000000-0000-0000-0000-000000000001', 'B3', 6, 'available', 'B区-中央'),
('00000000-0000-0000-0000-000000000001', 'C1', 6, 'cleaning', 'C区-包间'),
('00000000-0000-0000-0000-000000000001', 'C2', 8, 'available', 'C区-包间'),
('00000000-0000-0000-0000-000000000001', 'VIP1', 10, 'available', 'VIP区'),
('00000000-0000-0000-0000-000000000001', 'VIP2', 12, 'reserved', 'VIP区');

-- 9. 创建员工
INSERT INTO staff (restaurant_id, name, email, phone, role, hourly_rate, is_active) VALUES
('00000000-0000-0000-0000-000000000001', '张经理', 'zhang@synapse.com', '13800138001', 'manager', 80.00, true),
('00000000-0000-0000-0000-000000000001', '李主厨', 'li@synapse.com', '13800138002', 'chef', 70.00, true),
('00000000-0000-0000-0000-000000000001', '王服务员', 'wang@synapse.com', '13800138003', 'server', 35.00, true),
('00000000-0000-0000-0000-000000000001', '陈服务员', 'chen@synapse.com', '13800138004', 'server', 35.00, true),
('00000000-0000-0000-0000-000000000001', '赵收银', 'zhao@synapse.com', '13800138005', 'cashier', 40.00, true),
('00000000-0000-0000-0000-000000000001', '刘迎宾', 'liu@synapse.com', '13800138006', 'host', 35.00, true),
('00000000-0000-0000-0000-000000000001', '周厨师', 'zhou@synapse.com', '13800138007', 'chef', 55.00, true),
('00000000-0000-0000-0000-000000000001', '吴服务员', 'wu@synapse.com', '13800138008', 'server', 35.00, false);

-- 10. 创建示例订单
INSERT INTO orders (id, restaurant_id, order_number, order_type, status, table_number, subtotal, tax, total, created_at) VALUES
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ORD-001', 'dine_in', 'preparing', 'A2', 184.00, 14.72, 198.72, NOW() - INTERVAL '30 minutes'),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ORD-002', 'dine_in', 'ready', 'B1', 116.00, 9.28, 125.28, NOW() - INTERVAL '45 minutes'),
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'ORD-003', 'takeout', 'pending', NULL, 88.00, 7.04, 95.04, NOW() - INTERVAL '5 minutes');

-- 11. 创建订单项
INSERT INTO order_items (order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, status) 
SELECT 
  '20000000-0000-0000-0000-000000000001',
  id,
  name,
  2,
  price,
  price * 2,
  'preparing'
FROM menu_items WHERE name = '招牌宫保鸡丁';

INSERT INTO order_items (order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, status) 
SELECT 
  '20000000-0000-0000-0000-000000000001',
  id,
  name,
  1,
  price,
  price,
  'preparing'
FROM menu_items WHERE name = '蒜蓉粉丝蒸扇贝';

INSERT INTO order_items (order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, status) 
SELECT 
  '20000000-0000-0000-0000-000000000002',
  id,
  name,
  1,
  price,
  price,
  'ready'
FROM menu_items WHERE name = '水煮牛肉';

INSERT INTO order_items (order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, status) 
SELECT 
  '20000000-0000-0000-0000-000000000002',
  id,
  name,
  1,
  price,
  price,
  'ready'
FROM menu_items WHERE name = '麻婆豆腐';

INSERT INTO order_items (order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, status) 
SELECT 
  '20000000-0000-0000-0000-000000000003',
  id,
  name,
  2,
  price,
  price * 2,
  'pending'
FROM menu_items WHERE name = '扬州炒饭';

INSERT INTO order_items (order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, status) 
SELECT 
  '20000000-0000-0000-0000-000000000003',
  id,
  name,
  1,
  price,
  price,
  'pending'
FROM menu_items WHERE name = '担担面';

-- =============================================
-- 完成提示
-- =============================================

SELECT 'Demo data inserted successfully!' AS message;
SELECT COUNT(*) AS menu_items_count FROM menu_items;
SELECT COUNT(*) AS tables_count FROM tables;
SELECT COUNT(*) AS staff_count FROM staff;
SELECT COUNT(*) AS orders_count FROM orders;
