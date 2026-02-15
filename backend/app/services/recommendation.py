"""
智能推荐服务 - 基于顾客口味、历史订单、时段等推荐菜品
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.models.menu import MenuItem, MenuCategory
from app.models.order import Order, OrderItem


class RecommendationService:
    """智能推荐服务"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_personalized_recommendations(
        self,
        customer_id: str,
        restaurant_id: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        基于顾客历史的个性化推荐
        
        Args:
            customer_id: 顾客ID
            restaurant_id: 餐厅ID
            limit: 推荐数量
            
        Returns:
            推荐菜品列表
        """
        # 获取顾客历史订单
        result = await self.db.execute(
            select(OrderItem.menu_item_id, func.count(OrderItem.id).label('order_count'))
            .join(Order, OrderItem.order_id == Order.id)
            .where(
                and_(
                    Order.customer_id == customer_id,
                    Order.restaurant_id == restaurant_id
                )
            )
            .group_by(OrderItem.menu_item_id)
            .order_by(func.count(OrderItem.id).desc())
            .limit(10)
        )
        frequently_ordered = {row[0]: row[1] for row in result.all()}
        
        # 获取顾客从未点过但评价高的菜品
        ordered_ids = list(frequently_ordered.keys())
        
        new_items_query = select(MenuItem).where(
            and_(
                MenuItem.restaurant_id == restaurant_id,
                MenuItem.is_available == True,
                MenuItem.is_featured == True
            )
        )
        if ordered_ids:
            new_items_query = new_items_query.where(MenuItem.id.not_in(ordered_ids))
        
        new_items_result = await self.db.execute(new_items_query.limit(limit))
        new_items = new_items_result.scalars().all()
        
        # 组合推荐：一部分是经常点的，一部分是新品
        recommendations = []
        
        # 添加经常点的菜品（复购推荐）
        if frequently_ordered:
            top_ordered = list(frequently_ordered.keys())[:2]
            for item_id in top_ordered:
                item = await self.db.get(MenuItem, item_id)
                if item and item.is_available:
                    recommendations.append({
                        "menu_item": item,
                        "reason": "您经常点的",
                        "score": 0.95
                    })
        
        # 添加新品推荐
        for item in new_items[:limit - len(recommendations)]:
            recommendations.append({
                "menu_item": item,
                "reason": "为您推荐",
                "score": 0.8
            })
        
        return recommendations
    
    async def get_upsell_recommendations(
        self,
        current_items: List[str],  # 当前购物车中的菜品ID
        restaurant_id: str,
        limit: int = 3
    ) -> List[Dict[str, Any]]:
        """
        追加销售推荐（Upsell）
        
        Args:
            current_items: 当前购物车菜品
            restaurant_id: 餐厅ID
            limit: 推荐数量
            
        Returns:
            推荐菜品列表
        """
        if not current_items:
            return []
        
        # 分析购物车中的菜品类型
        result = await self.db.execute(
            select(MenuItem).where(MenuItem.id.in_(current_items))
        )
        cart_items = result.scalars().all()
        cart_categories = set(item.category_id for item in cart_items)
        
        # 查找经常一起购买的菜品（关联分析）
        # 简化实现：推荐不同类别的热销菜品
        result = await self.db.execute(
            select(MenuItem)
            .where(
                and_(
                    MenuItem.restaurant_id == restaurant_id,
                    MenuItem.is_available == True,
                    MenuItem.id.not_in(current_items),
                    MenuItem.category_id.not_in(cart_categories)  # 不同类别
                )
            )
            .order_by(MenuItem.is_featured.desc())
            .limit(limit)
        )
        suggested_items = result.scalars().all()
        
        recommendations = []
        for item in suggested_items:
            recommendations.append({
                "menu_item": item,
                "reason": "搭配推荐",
                "score": 0.75
            })
        
        return recommendations
    
    async def get_time_based_recommendations(
        self,
        restaurant_id: str,
        current_time: Optional[datetime] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        基于时段的推荐
        
        Args:
            restaurant_id: 餐厅ID
            current_time: 当前时间
            limit: 推荐数量
            
        Returns:
            推荐菜品列表
        """
        if not current_time:
            current_time = datetime.now()
        
        hour = current_time.hour
        
        # 确定时段
        if 6 <= hour < 11:
            time_period = "breakfast"
            reason = "早餐推荐"
        elif 11 <= hour < 14:
            time_period = "lunch"
            reason = "午餐热销"
        elif 14 <= hour < 17:
            time_period = "afternoon"
            reason = "下午茶推荐"
        elif 17 <= hour < 21:
            time_period = "dinner"
            reason = "晚餐推荐"
        else:
            time_period = "late_night"
            reason = "夜宵推荐"
        
        # 查询该时段的热销菜品
        # 简化实现：返回推荐菜品
        result = await self.db.execute(
            select(MenuItem)
            .where(
                and_(
                    MenuItem.restaurant_id == restaurant_id,
                    MenuItem.is_available == True,
                    MenuItem.is_featured == True
                )
            )
            .limit(limit)
        )
        items = result.scalars().all()
        
        recommendations = []
        for item in items:
            recommendations.append({
                "menu_item": item,
                "reason": reason,
                "time_period": time_period,
                "score": 0.85
            })
        
        return recommendations
    
    async def get_taste_profile_recommendations(
        self,
        taste_preferences: Dict[str, Any],  # 顾客口味档案
        restaurant_id: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        基于口味档案的推荐
        
        Args:
            taste_preferences: 口味偏好 {"spicy_level": 3, "allergies": ["花生"], "preferences": ["清淡"]}
            restaurant_id: 餐厅ID
            limit: 推荐数量
            
        Returns:
            推荐菜品列表
        """
        # 获取所有可用菜品
        result = await self.db.execute(
            select(MenuItem)
            .where(
                and_(
                    MenuItem.restaurant_id == restaurant_id,
                    MenuItem.is_available == True
                )
            )
        )
        all_items = result.scalars().all()
        
        # 根据口味偏好过滤和评分
        recommendations = []
        allergies = taste_preferences.get("allergies", [])
        preferences = taste_preferences.get("preferences", [])
        
        for item in all_items:
            score = 0.5  # 基础分
            reasons = []
            
            # 检查过敏原（简化实现，实际需要菜品标签）
            # TODO: 添加菜品过敏原标签
            
            # 检查口味偏好匹配
            if item.is_featured:
                score += 0.2
                reasons.append("招牌菜")
            
            if score > 0.5:
                recommendations.append({
                    "menu_item": item,
                    "reason": "、".join(reasons) if reasons else "为您推荐",
                    "score": min(score, 1.0)
                })
        
        # 按分数排序
        recommendations.sort(key=lambda x: x["score"], reverse=True)
        
        return recommendations[:limit]
