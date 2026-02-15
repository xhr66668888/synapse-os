from fastapi import APIRouter
from app.api.v1 import auth, menu, orders, tables, staff, robot, modifiers, payments, inventory, schedule, reports, agent, reservations, loyalty

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(menu.router, prefix="/menu", tags=["菜单"])
api_router.include_router(modifiers.router, prefix="/modifiers", tags=["修饰符"])
api_router.include_router(orders.router, prefix="/orders", tags=["订单"])
api_router.include_router(payments.router, prefix="/payments", tags=["支付"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["库存"])
api_router.include_router(schedule.router, prefix="/schedule", tags=["排班"])
api_router.include_router(reports.router, prefix="/reports", tags=["报表"])
api_router.include_router(tables.router, prefix="/tables", tags=["桌位"])
api_router.include_router(staff.router, prefix="/staff", tags=["员工"])
api_router.include_router(robot.router, prefix="/robot", tags=["机器人"])
api_router.include_router(reservations.router, prefix="/reservations", tags=["预订"])
api_router.include_router(loyalty.router, prefix="/loyalty", tags=["忠诚度"])
api_router.include_router(agent.router, tags=["AI Agent"])
