
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import logging

from app.database import get_db
from app.models.order import OrderItem, Order
from app.models.menu import MenuItem
from app.services.expo import ExpoService
from app.services.recommendation import RecommendationService

# 设置日志
logger = logging.getLogger(__name__)

router = APIRouter()

# --- Schemas ---

class RobotStatus(BaseModel):
    id: str
    name: str
    status: str  # idle, cooking, warming, error
    current_dish: str | None = None
    temperature: int = 0
    time_remaining: int = 0
    order_id: str | None = None

class PendingItem(BaseModel):
    id: str
    dish_name: str
    quantity: int
    wait_time: str
    order_number: str

# --- Mock Data ---

MOCK_ROBOTS = [
    {
        "id": "robot-1",
        "name": "机器人 #1",
        "status": "idle",
        "temperature": 150,
        "time_remaining": 0
    },
    {
        "id": "robot-2",
        "name": "机器人 #2",
        "status": "cooking",
        "current_dish": "宫保鸡丁",
        "temperature": 180,
        "time_remaining": 45,
        "order_id": "#1925"
    },
    {
        "id": "robot-3",
        "name": "机器人 #3",
        "status": "warming",
        "temperature": 120,
        "time_remaining": 30
    }
]

# --- Services ---

async def push_recipe_to_robot_device(robot_id: str, recipe: Dict[str, Any]):
    """
    模拟推送到物理机器人
    在真实场景中，这里会发送 HTTP/WebSocket 请求到机器人 IP
    """
    logger.info(f"📡 Pushing recipe to {robot_id}: {recipe}")
    # 模拟延迟
    return True

# --- APIs ---

@router.get("/robots", response_model=List[RobotStatus])
async def get_robots():
    """获取所有机器人状态"""
    # 简单起见，返回 Mock 数据
    return MOCK_ROBOTS

@router.get("/pending-items", response_model=List[PendingItem])
async def get_pending_items(
    restaurant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取等待制作的订单项"""
    # 查询条件：
    # 1. 关联的订单状态不是 'completed' 或 'cancelled'
    # 2. 订单项 robot_status 为 'pending'
    # 3. 关联的菜品有 recipe_json (说明需要机器人做)
    
    # 注意：这里简化逻辑，假设所有带 robot_recipe_json 的都需要机器人
    stmt = (
        select(OrderItem, Order, MenuItem)
        .join(Order, OrderItem.order_id == Order.id)
        .join(MenuItem, OrderItem.menu_item_id == MenuItem.id)
        .where(Order.restaurant_id == restaurant_id)
        .where(Order.status.in_(['pending', 'preparing']))
        .where(OrderItem.robot_status == 'pending')
        .where(MenuItem.robot_recipe_json.is_not(None))
    )
    
    result = await db.execute(stmt)
    items = result.all()
    
    pending_list = []
    for order_item, order, menu_item in items:
        pending_list.append(PendingItem(
            id=order_item.id,
            dish_name=menu_item.name,
            quantity=order_item.quantity,
            wait_time="5分钟", # 估算时间
            order_number=order.order_number
        ))
        
    return pending_list

@router.post("/push/{order_item_id}")
async def push_to_robot(
    order_item_id: str,
    robot_id: str,
    db: AsyncSession = Depends(get_db)
):
    """将订单项推送到指定机器人"""
    stmt = (
        select(OrderItem)
        .where(OrderItem.id == order_item_id)
    )
    result = await db.execute(stmt)
    order_item = result.scalar_one_or_none()
    
    if not order_item:
        raise HTTPException(status_code=404, detail="订单项不存在")
        
    # 获取菜谱
    menu_item_result = await db.execute(
        select(MenuItem).where(MenuItem.id == order_item.menu_item_id)
    )
    menu_item = menu_item_result.scalar_one_or_none()
    
    if not menu_item or not menu_item.robot_recipe_json:
        raise HTTPException(status_code=400, detail="该菜品没有配置机器人菜谱")
        
    # 推送指令
    await push_recipe_to_robot_device(robot_id, menu_item.robot_recipe_json)
    
    # 更新状态
    order_item.assigned_robot_id = robot_id
    order_item.robot_status = 'cooking'
    
    await db.commit()
    
    return {"message": f"已推送给 {robot_id}", "status": "success"}


# ============ Expo 出餐协调 API ============

@router.get("/expo/queue")
async def get_expo_queue(
    restaurant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取出餐协调队列"""
    expo_service = ExpoService(db)
    return await expo_service.get_expo_queue(restaurant_id)


@router.get("/expo/pacing/{order_id}")
async def get_order_pacing(
    order_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取订单的出餐节奏计划"""
    expo_service = ExpoService(db)
    return await expo_service.calculate_pacing(order_id)


@router.get("/expo/coordinate/{order_id}")
async def get_coordination_plan(
    order_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取机器人和厨房的协调计划"""
    expo_service = ExpoService(db)
    return await expo_service.coordinate_robot_and_kitchen(order_id)


@router.post("/expo/item/{item_id}/ready")
async def mark_item_ready(
    item_id: str,
    db: AsyncSession = Depends(get_db)
):
    """标记菜品已准备好"""
    expo_service = ExpoService(db)
    success = await expo_service.mark_item_ready(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="订单项不存在")
    return {"message": "已标记为准备好", "item_id": item_id}


@router.post("/expo/item/{item_id}/served")
async def mark_item_served(
    item_id: str,
    db: AsyncSession = Depends(get_db)
):
    """标记菜品已上桌"""
    expo_service = ExpoService(db)
    success = await expo_service.mark_item_served(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="订单项不存在")
    return {"message": "已标记为上桌", "item_id": item_id}


@router.get("/expo/tables")
async def get_tables_expo_status(
    restaurant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取所有桌位的出餐状态"""
    expo_service = ExpoService(db)
    return await expo_service.get_table_status(restaurant_id)


# ============ 智能推荐 API ============

@router.get("/recommendations/personalized")
async def get_personalized_recommendations(
    restaurant_id: str,
    customer_id: Optional[str] = None,
    limit: int = 5,
    db: AsyncSession = Depends(get_db)
):
    """获取个性化推荐"""
    rec_service = RecommendationService(db)
    
    if customer_id:
        return await rec_service.get_personalized_recommendations(
            customer_id, restaurant_id, limit
        )
    else:
        return await rec_service.get_time_based_recommendations(
            restaurant_id, limit=limit
        )


@router.get("/recommendations/upsell")
async def get_upsell_recommendations(
    restaurant_id: str,
    current_items: str,  # 逗号分隔的菜品ID
    limit: int = 3,
    db: AsyncSession = Depends(get_db)
):
    """获取追加销售推荐"""
    rec_service = RecommendationService(db)
    item_ids = [id.strip() for id in current_items.split(",") if id.strip()]
    return await rec_service.get_upsell_recommendations(
        item_ids, restaurant_id, limit
    )


@router.get("/recommendations/time-based")
async def get_time_based_recommendations(
    restaurant_id: str,
    limit: int = 5,
    db: AsyncSession = Depends(get_db)
):
    """获取基于时段的推荐"""
    rec_service = RecommendationService(db)
    return await rec_service.get_time_based_recommendations(
        restaurant_id, limit=limit
    )
