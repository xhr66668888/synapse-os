"""
Expo 出餐协调服务 - 确保同桌菜品同时出餐，实现智能 Pacing
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from collections import defaultdict

from app.models.order import Order, OrderItem, OrderStatus, FireStatus
from app.models.menu import MenuItem


class ExpoService:
    """
    Expo (出餐协调) 服务
    
    核心功能：
    1. 同桌同时出餐：确保同一桌的菜品尽量同时上桌
    2. 课程管理：按前菜、主菜、甜点等顺序出餐
    3. Pacing：根据烹饪时间差异，智能调整下单时间
    4. 机器人协调：协调机器人和人工厨房的出餐节奏
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_expo_queue(self, restaurant_id: str) -> List[Dict[str, Any]]:
        """
        获取出餐协调队列
        
        返回按桌号和课程组织的待出餐项
        """
        # 获取所有待出餐的订单项
        result = await self.db.execute(
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.menu_item))
            .where(
                and_(
                    Order.restaurant_id == restaurant_id,
                    Order.status.in_([OrderStatus.PREPARING]),
                )
            )
            .order_by(Order.created_at)
        )
        orders = result.scalars().all()
        
        # 按桌号组织
        expo_queue = []
        
        for order in orders:
            # 按课程分组
            courses = defaultdict(list)
            for item in order.items:
                if item.fire_status == FireStatus.FIRED and item.item_status not in ["void", "served"]:
                    courses[item.course].append({
                        "item_id": item.id,
                        "menu_item_name": item.menu_item.name if item.menu_item else "Unknown",
                        "quantity": item.quantity,
                        "seat_number": item.seat_number,
                        "robot_status": item.robot_status,
                        "fired_at": item.fired_at,
                        "prep_time": item.menu_item.prep_time_minutes if item.menu_item else 10,
                        "estimated_ready": self._estimate_ready_time(item)
                    })
            
            if courses:
                expo_queue.append({
                    "order_id": order.id,
                    "order_number": order.order_number,
                    "table_number": order.table_number,
                    "current_course": order.current_course,
                    "total_courses": order.total_courses,
                    "courses": dict(courses),
                    "all_items_ready": self._check_course_ready(courses.get(order.current_course, []))
                })
        
        return expo_queue
    
    def _estimate_ready_time(self, item: OrderItem) -> Optional[datetime]:
        """估算菜品完成时间"""
        if not item.fired_at:
            return None
        
        prep_time = item.menu_item.prep_time_minutes if item.menu_item else 10
        return item.fired_at + timedelta(minutes=prep_time)
    
    def _check_course_ready(self, items: List[Dict]) -> bool:
        """检查当前课程的所有菜品是否都准备好"""
        if not items:
            return False
        
        now = datetime.utcnow()
        for item in items:
            if item.get("estimated_ready") and item["estimated_ready"] > now:
                return False
            if item.get("robot_status") not in ["completed", "ready"]:
                return False
        
        return True
    
    async def calculate_pacing(
        self,
        order_id: str
    ) -> Dict[str, Any]:
        """
        计算 Pacing（出餐节奏）
        
        根据菜品的烹饪时间，计算何时应该 Fire 各个菜品，
        以确保同一课程的菜品同时完成
        """
        result = await self.db.execute(
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.menu_item))
            .where(Order.id == order_id)
        )
        order = result.scalar_one_or_none()
        
        if not order:
            return {"error": "Order not found"}
        
        # 按课程分析
        pacing_plan = {}
        
        for course_num in range(1, order.total_courses + 1):
            course_items = [item for item in order.items if item.course == course_num]
            
            if not course_items:
                continue
            
            # 找出该课程中烹饪时间最长的菜品
            max_prep_time = max(
                (item.menu_item.prep_time_minutes if item.menu_item else 10)
                for item in course_items
            )
            
            # 计算每个菜品应该何时开始
            item_timings = []
            for item in course_items:
                prep_time = item.menu_item.prep_time_minutes if item.menu_item else 10
                delay_minutes = max_prep_time - prep_time  # 延迟开始的时间
                
                item_timings.append({
                    "item_id": item.id,
                    "menu_item_name": item.menu_item.name if item.menu_item else "Unknown",
                    "prep_time_minutes": prep_time,
                    "delay_start_minutes": delay_minutes,
                    "is_robot": item.menu_item.robot_recipe_json is not None if item.menu_item else False
                })
            
            pacing_plan[f"course_{course_num}"] = {
                "total_prep_time": max_prep_time,
                "items": item_timings
            }
        
        return {
            "order_id": order_id,
            "order_number": order.order_number,
            "pacing_plan": pacing_plan
        }
    
    async def coordinate_robot_and_kitchen(
        self,
        order_id: str
    ) -> Dict[str, Any]:
        """
        协调机器人和人工厨房的出餐
        
        确保机器人做的菜和人工做的菜能同时出餐
        """
        result = await self.db.execute(
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.menu_item))
            .where(Order.id == order_id)
        )
        order = result.scalar_one_or_none()
        
        if not order:
            return {"error": "Order not found"}
        
        coordination_plan = {
            "order_id": order_id,
            "table_number": order.table_number,
            "robot_items": [],
            "kitchen_items": [],
            "coordination_notes": []
        }
        
        current_course_items = [
            item for item in order.items 
            if item.course == order.current_course and item.fire_status == FireStatus.FIRED
        ]
        
        for item in current_course_items:
            is_robot = item.menu_item.robot_recipe_json is not None if item.menu_item else False
            prep_time = item.menu_item.prep_time_minutes if item.menu_item else 10
            
            item_info = {
                "item_id": item.id,
                "name": item.menu_item.name if item.menu_item else "Unknown",
                "prep_time": prep_time,
                "status": item.robot_status if is_robot else item.item_status,
                "fired_at": item.fired_at
            }
            
            if is_robot:
                coordination_plan["robot_items"].append(item_info)
            else:
                coordination_plan["kitchen_items"].append(item_info)
        
        # 生成协调建议
        if coordination_plan["robot_items"] and coordination_plan["kitchen_items"]:
            robot_max_time = max(i["prep_time"] for i in coordination_plan["robot_items"])
            kitchen_max_time = max(i["prep_time"] for i in coordination_plan["kitchen_items"])
            
            time_diff = abs(robot_max_time - kitchen_max_time)
            
            if time_diff > 5:
                if robot_max_time > kitchen_max_time:
                    coordination_plan["coordination_notes"].append(
                        f"建议厨房延迟 {time_diff} 分钟开始制作，以配合机器人出餐"
                    )
                else:
                    coordination_plan["coordination_notes"].append(
                        f"建议提前 {time_diff} 分钟启动机器人，以配合厨房出餐"
                    )
            else:
                coordination_plan["coordination_notes"].append("出餐时间协调良好")
        
        return coordination_plan
    
    async def mark_item_ready(self, item_id: str) -> bool:
        """标记菜品已准备好"""
        item = await self.db.get(OrderItem, item_id)
        if not item:
            return False
        
        item.item_status = "ready"
        await self.db.commit()
        return True
    
    async def mark_item_served(self, item_id: str) -> bool:
        """标记菜品已上桌"""
        item = await self.db.get(OrderItem, item_id)
        if not item:
            return False
        
        item.item_status = "served"
        
        # 检查该课程是否全部上桌
        result = await self.db.execute(
            select(OrderItem).where(
                and_(
                    OrderItem.order_id == item.order_id,
                    OrderItem.course == item.course
                )
            )
        )
        course_items = result.scalars().all()
        
        all_served = all(i.item_status == "served" for i in course_items)
        
        if all_served:
            # 更新订单当前课程
            order = await self.db.get(Order, item.order_id)
            if order and order.current_course == item.course:
                order.current_course = item.course + 1
        
        await self.db.commit()
        return True
    
    async def get_table_status(self, restaurant_id: str) -> List[Dict[str, Any]]:
        """
        获取所有桌位的出餐状态
        """
        result = await self.db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(
                and_(
                    Order.restaurant_id == restaurant_id,
                    Order.status.in_([OrderStatus.PENDING, OrderStatus.PREPARING]),
                    Order.table_number.isnot(None)
                )
            )
        )
        orders = result.scalars().all()
        
        table_status = []
        
        for order in orders:
            fired_items = [i for i in order.items if i.fire_status == FireStatus.FIRED]
            ready_items = [i for i in fired_items if i.item_status == "ready"]
            served_items = [i for i in order.items if i.item_status == "served"]
            
            table_status.append({
                "table_number": order.table_number,
                "order_number": order.order_number,
                "order_id": order.id,
                "current_course": order.current_course,
                "total_courses": order.total_courses,
                "total_items": len(order.items),
                "fired_items": len(fired_items),
                "ready_items": len(ready_items),
                "served_items": len(served_items),
                "progress_percentage": (len(served_items) / len(order.items) * 100) if order.items else 0,
                "course_ready": len(ready_items) == len([
                    i for i in fired_items if i.course == order.current_course
                ])
            })
        
        return table_status
