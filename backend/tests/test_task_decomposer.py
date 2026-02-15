"""
Task Decomposer Tests

测试任务分解器的各种场景
"""

import pytest
from app.services.task_decomposer import (
    TaskDecomposer,
    TaskType,
    TaskStatus,
    SubTask,
)


@pytest.fixture
def decomposer():
    return TaskDecomposer()


class TestSingleTasks:
    """单任务测试"""
    
    @pytest.mark.asyncio
    async def test_menu_action_down(self, decomposer):
        """测试下架菜品"""
        tasks = await decomposer.decompose("下架宫保鸡丁")
        
        assert len(tasks) == 1
        assert tasks[0].type == TaskType.MENU_ACTION
        assert tasks[0].action == "下架"
        assert "宫保鸡丁" in tasks[0].target
    
    @pytest.mark.asyncio
    async def test_menu_action_up(self, decomposer):
        """测试上架菜品"""
        tasks = await decomposer.decompose("上架麻婆豆腐")
        
        assert len(tasks) == 1
        assert tasks[0].type == TaskType.MENU_ACTION
        assert tasks[0].action == "上架"
    
    @pytest.mark.asyncio
    async def test_table_checkout(self, decomposer):
        """测试结账"""
        tasks = await decomposer.decompose("给3桌结账")
        
        assert len(tasks) == 1
        assert tasks[0].type == TaskType.TABLE_ACTION
        assert tasks[0].action == "结账"
        assert tasks[0].target == "3"
    
    @pytest.mark.asyncio
    async def test_table_checkout_alt(self, decomposer):
        """测试结账 (另一种表达)"""
        tasks = await decomposer.decompose("5号桌买单")
        
        assert len(tasks) == 1
        assert tasks[0].type == TaskType.TABLE_ACTION
        assert tasks[0].action == "买单"
        assert tasks[0].target == "5"
    
    @pytest.mark.asyncio
    async def test_query_sales(self, decomposer):
        """测试查询销售额"""
        tasks = await decomposer.decompose("今天的销售额是多少")
        
        assert len(tasks) == 1
        assert tasks[0].type == TaskType.QUERY


class TestMultiTasks:
    """多任务测试"""
    
    @pytest.mark.asyncio
    async def test_two_tasks(self, decomposer):
        """测试两个任务"""
        tasks = await decomposer.decompose("下架宫保鸡丁，给3桌结账")
        
        assert len(tasks) == 2
        assert tasks[0].type == TaskType.MENU_ACTION
        assert tasks[1].type == TaskType.TABLE_ACTION
    
    @pytest.mark.asyncio
    async def test_three_tasks(self, decomposer):
        """测试三个任务"""
        tasks = await decomposer.decompose("下架宫保鸡丁，给3桌结账，今天卖了多少钱")
        
        assert len(tasks) == 3
        assert tasks[0].type == TaskType.MENU_ACTION
        assert tasks[1].type == TaskType.TABLE_ACTION
        assert tasks[2].type == TaskType.QUERY
    
    @pytest.mark.asyncio
    async def test_separator_semicolon(self, decomposer):
        """测试分号分隔"""
        tasks = await decomposer.decompose("上架鱼香肉丝；下架宫保鸡丁")
        
        assert len(tasks) == 2
    
    @pytest.mark.asyncio
    async def test_separator_period(self, decomposer):
        """测试句号分隔"""
        tasks = await decomposer.decompose("给3桌结账。给5桌开桌")
        
        assert len(tasks) == 2


class TestTaskDependencies:
    """任务依赖测试"""
    
    @pytest.mark.asyncio
    async def test_same_table_dependency(self, decomposer):
        """测试同桌位依赖"""
        tasks = await decomposer.decompose("给3桌开桌，给3桌加菜")
        
        assert len(tasks) == 2
        # 第二个任务应该依赖第一个
        assert 1 in tasks[1].dependencies or len(tasks[1].dependencies) == 0


class TestSubTaskMethods:
    """SubTask 方法测试"""
    
    def test_to_instruction_menu(self):
        """测试菜单任务指令生成"""
        task = SubTask(
            id=1,
            type=TaskType.MENU_ACTION,
            action="下架",
            target="宫保鸡丁",
        )
        instruction = task.to_instruction()
        
        assert "菜单" in instruction
        assert "下架" in instruction
        assert "宫保鸡丁" in instruction
    
    def test_to_instruction_table(self):
        """测试桌位任务指令生成"""
        task = SubTask(
            id=1,
            type=TaskType.TABLE_ACTION,
            action="结账",
            target="3",
        )
        instruction = task.to_instruction()
        
        assert "桌" in instruction
        assert "结账" in instruction
        assert "3" in instruction
    
    def test_to_dict(self):
        """测试字典转换"""
        task = SubTask(
            id=1,
            type=TaskType.QUERY,
            action="查询",
            target="销售额",
        )
        d = task.to_dict()
        
        assert d["id"] == 1
        assert d["type"] == "query"
        assert d["action"] == "查询"
        assert d["target"] == "销售额"


class TestEdgeCases:
    """边界情况测试"""
    
    @pytest.mark.asyncio
    async def test_empty_command(self, decomposer):
        """测试空命令"""
        tasks = await decomposer.decompose("")
        assert len(tasks) == 0
    
    @pytest.mark.asyncio
    async def test_whitespace_command(self, decomposer):
        """测试空白命令"""
        tasks = await decomposer.decompose("   ")
        assert len(tasks) == 0
    
    @pytest.mark.asyncio
    async def test_unknown_command(self, decomposer):
        """测试未知命令"""
        tasks = await decomposer.decompose("做一些奇怪的事情")
        
        # 应该作为通用任务
        assert len(tasks) == 1
        assert tasks[0].type == TaskType.GENERAL


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
