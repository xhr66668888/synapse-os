"""
忠诚度系统API
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from datetime import datetime, timedelta
import secrets

from app.database import get_db
from app.models.loyalty import (
    CustomerLoyalty, PointTransaction, Reward, RewardRedemption,
    LoyaltyProgram, LoyaltyTier, PointTransactionType, RewardType
)
from app.models.user import User

router = APIRouter()


@router.get("/profile/{customer_id}")
async def get_loyalty_profile(
    customer_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取客户忠诚度档案"""
    result = await db.execute(
        select(CustomerLoyalty).where(CustomerLoyalty.customer_id == customer_id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(status_code=404, detail="忠诚度档案不存在")
    
    return {
        "id": profile.id,
        "points_balance": profile.points_balance,
        "points_lifetime": profile.points_lifetime,
        "tier": profile.tier,
        "total_visits": profile.total_visits,
        "total_spent": profile.total_spent,
        "referral_code": profile.referral_code,
        "referrals_count": profile.referrals_count
    }


@router.post("/profile/create")
async def create_loyalty_profile(
    customer_id: str,
    restaurant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """创建忠诚度档案"""
    # 检查是否已存在
    existing = await db.execute(
        select(CustomerLoyalty).where(CustomerLoyalty.customer_id == customer_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="忠诚度档案已存在")
    
    # 获取计划配置
    program = await db.execute(
        select(LoyaltyProgram).where(LoyaltyProgram.restaurant_id == restaurant_id)
    )
    program_config = program.scalar_one_or_none()
    
    # 生成推荐码
    referral_code = f"REF{secrets.token_hex(4).upper()}"
    
    # 创建档案
    profile = CustomerLoyalty(
        customer_id=customer_id,
        restaurant_id=restaurant_id,
        referral_code=referral_code
    )
    
    db.add(profile)
    await db.flush()
    
    # 注册奖励积分
    if program_config and program_config.signup_bonus_points > 0:
        transaction = PointTransaction(
            loyalty_id=profile.id,
            transaction_type=PointTransactionType.BONUS,
            points=program_config.signup_bonus_points,
            balance_after=program_config.signup_bonus_points,
            description="注册奖励"
        )
        profile.points_balance = program_config.signup_bonus_points
        profile.points_lifetime = program_config.signup_bonus_points
        db.add(transaction)
    
    await db.commit()
    await db.refresh(profile)
    
    return {"id": profile.id, "referral_code": referral_code}


@router.post("/points/earn")
async def earn_points(
    customer_id: str,
    order_id: str,
    amount: float,
    db: AsyncSession = Depends(get_db)
):
    """消费获得积分"""
    # 获取忠诚度档案
    result = await db.execute(
        select(CustomerLoyalty).where(CustomerLoyalty.customer_id == customer_id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(status_code=404, detail="忠诚度档案不存在")
    
    # 获取计划配置
    program = await db.execute(
        select(LoyaltyProgram).where(LoyaltyProgram.restaurant_id == profile.restaurant_id)
    )
    program_config = program.scalar_one_or_none()
    
    # 计算积分
    points_per_dollar = program_config.points_per_dollar if program_config else 1.0
    points = int(amount * points_per_dollar)
    
    # 更新档案
    profile.points_balance += points
    profile.points_lifetime += points
    profile.total_spent += amount
    profile.total_visits += 1
    profile.last_visit_date = datetime.utcnow()
    
    # 检查等级升级
    if program_config:
        new_tier = calculate_tier(profile.points_lifetime, program_config)
        if new_tier != profile.tier:
            profile.tier = new_tier
            profile.tier_start_date = datetime.utcnow()
    
    # 记录交易
    transaction = PointTransaction(
        loyalty_id=profile.id,
        transaction_type=PointTransactionType.EARN,
        points=points,
        balance_after=profile.points_balance,
        order_id=order_id,
        description=f"消费¥{amount:.2f}获得积分",
        expires_at=datetime.utcnow() + timedelta(days=365) if program_config else None
    )
    
    db.add(transaction)
    await db.commit()
    
    return {
        "points_earned": points,
        "balance": profile.points_balance,
        "tier": profile.tier
    }


@router.get("/rewards/")
async def get_rewards(
    restaurant_id: str,
    tier: Optional[LoyaltyTier] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取可兑换奖励列表"""
    query = select(Reward).where(
        and_(
            Reward.restaurant_id == restaurant_id,
            Reward.is_active == True
        )
    )
    
    if tier:
        query = query.where(
            or_(
                Reward.tier_required == None,
                Reward.tier_required == tier
            )
        )
    
    query = query.order_by(Reward.points_cost)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/rewards/redeem")
async def redeem_reward(
    customer_id: str,
    reward_id: str,
    db: AsyncSession = Depends(get_db)
):
    """兑换奖励"""
    # 获取忠诚度档案
    profile_result = await db.execute(
        select(CustomerLoyalty).where(CustomerLoyalty.customer_id == customer_id)
    )
    profile = profile_result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(status_code=404, detail="忠诚度档案不存在")
    
    # 获取奖励
    reward_result = await db.execute(
        select(Reward).where(Reward.id == reward_id)
    )
    reward = reward_result.scalar_one_or_none()
    
    if not reward:
        raise HTTPException(status_code=404, detail="奖励不存在")
    
    # 检查积分是否足够
    if profile.points_balance < reward.points_cost:
        raise HTTPException(status_code=400, detail="积分不足")
    
    # 检查等级要求
    if reward.tier_required and not check_tier_eligible(profile.tier, reward.tier_required):
        raise HTTPException(status_code=400, detail="会员等级不足")
    
    # 检查库存
    if reward.remaining_quantity is not None and reward.remaining_quantity <= 0:
        raise HTTPException(status_code=400, detail="奖励已兑完")
    
    # 扣除积分
    profile.points_balance -= reward.points_cost
    profile.rewards_redeemed += 1
    
    # 记录积分交易
    transaction = PointTransaction(
        loyalty_id=profile.id,
        transaction_type=PointTransactionType.REDEEM,
        points=-reward.points_cost,
        balance_after=profile.points_balance,
        reward_id=reward_id,
        description=f"兑换奖励: {reward.name}"
    )
    
    # 创建兑换记录
    redemption = RewardRedemption(
        loyalty_id=profile.id,
        reward_id=reward_id,
        points_spent=reward.points_cost,
        expires_at=datetime.utcnow() + timedelta(days=30)  # 兑换券30天有效
    )
    
    # 更新库存
    if reward.remaining_quantity is not None:
        reward.remaining_quantity -= 1
    
    db.add(transaction)
    db.add(redemption)
    await db.commit()
    
    return {
        "redemption_id": redemption.id,
        "points_spent": reward.points_cost,
        "balance": profile.points_balance
    }


@router.get("/transactions/{customer_id}")
async def get_point_transactions(
    customer_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """获取积分交易记录"""
    # 获取档案ID
    profile_result = await db.execute(
        select(CustomerLoyalty).where(CustomerLoyalty.customer_id == customer_id)
    )
    profile = profile_result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(status_code=404, detail="忠诚度档案不存在")
    
    # 获取交易记录
    result = await db.execute(
        select(PointTransaction)
        .where(PointTransaction.loyalty_id == profile.id)
        .order_by(PointTransaction.created_at.desc())
        .limit(limit)
    )
    
    return result.scalars().all()


@router.get("/leaderboard")
async def get_leaderboard(
    restaurant_id: str,
    period: str = "month",  # month, quarter, year, all
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """获取排行榜"""
    query = select(CustomerLoyalty, User).join(
        User, CustomerLoyalty.customer_id == User.id
    ).where(
        CustomerLoyalty.restaurant_id == restaurant_id
    ).order_by(
        CustomerLoyalty.points_lifetime.desc()
    ).limit(limit)
    
    result = await db.execute(query)
    rows = result.all()
    
    leaderboard = []
    for idx, (loyalty, user) in enumerate(rows, 1):
        leaderboard.append({
            "rank": idx,
            "customer_name": user.name,
            "points": loyalty.points_lifetime,
            "tier": loyalty.tier,
            "total_spent": loyalty.total_spent
        })
    
    return leaderboard


def calculate_tier(lifetime_points: int, program: LoyaltyProgram) -> LoyaltyTier:
    """计算会员等级"""
    if lifetime_points >= program.diamond_threshold:
        return LoyaltyTier.DIAMOND
    elif lifetime_points >= program.platinum_threshold:
        return LoyaltyTier.PLATINUM
    elif lifetime_points >= program.gold_threshold:
        return LoyaltyTier.GOLD
    elif lifetime_points >= program.silver_threshold:
        return LoyaltyTier.SILVER
    else:
        return LoyaltyTier.BRONZE


def check_tier_eligible(customer_tier: LoyaltyTier, required_tier: LoyaltyTier) -> bool:
    """检查等级是否满足要求"""
    tier_order = [
        LoyaltyTier.BRONZE,
        LoyaltyTier.SILVER,
        LoyaltyTier.GOLD,
        LoyaltyTier.PLATINUM,
        LoyaltyTier.DIAMOND
    ]
    return tier_order.index(customer_tier) >= tier_order.index(required_tier)
