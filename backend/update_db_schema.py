
import asyncio
import os
import sys

# Add parent directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

async def update_schema():
    print("Starting schema update...")
    async with engine.begin() as conn:
        # 1. Update menu_items
        try:
            print("Checking menu_items...")
            await conn.execute(text("ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS robot_recipe_json JSON;"))
            await conn.execute(text("ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS recipe_id VARCHAR(36);")) 
            # Note: recipe_id was in model but maybe not in DB if it was added recently? 
            # Based on previous file view, recipe_id WAS in the file initially, so likely already in DB.
            # But the plan didn't mention adding recipe_id, only robot_recipe_json.
            # I'll just add robot_recipe_json.
            print("Updated menu_items.")
        except Exception as e:
            print(f"Error updating menu_items: {e}")

        # 2. Update order_items
        try:
            print("Checking order_items...")
            await conn.execute(text("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS assigned_robot_id VARCHAR(50);"))
            await conn.execute(text("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS robot_status VARCHAR(20) DEFAULT 'pending';"))
            print("Updated order_items.")
        except Exception as e:
            print(f"Error updating order_items: {e}")

    print("Schema update completed.")

if __name__ == "__main__":
    asyncio.run(update_schema())
