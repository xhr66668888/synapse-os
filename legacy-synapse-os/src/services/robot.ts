// 机器人指令服务
// 预留接口 - 待对接实际机器人协议

import type { GCodeParams, RobotCommand, TasteModifier } from '../types/database';

// 菜谱基础参数 (待厂家提供实际数据)
interface RecipeParams {
    recipeId: string;
    dishName: string;
    baseTemperature: number;  // 基础油温
    baseCookTime: number;     // 基础烹饪时间 (秒)
    baseStirFrequency: number; // 基础翻炒频率
}

// 模拟菜谱数据 (实际应从后端获取)
const mockRecipes: Record<string, RecipeParams> = {
    '1': { recipeId: 'R001', dishName: '宫保鸡丁', baseTemperature: 180, baseCookTime: 120, baseStirFrequency: 3 },
    '2': { recipeId: 'R002', dishName: '麻婆豆腐', baseTemperature: 160, baseCookTime: 90, baseStirFrequency: 2 },
    '3': { recipeId: 'R003', dishName: '红烧肉', baseTemperature: 140, baseCookTime: 300, baseStirFrequency: 1 },
};

/**
 * 口味偏好转 G-Code 参数
 * 预留接口 - 待机器人厂家提供参数映射规则
 */
export function convertTasteToGCode(
    taste: TasteModifier | undefined,
    baseRecipe: RecipeParams
): GCodeParams {
    const params: GCodeParams = {
        temperature: baseRecipe.baseTemperature,
        cook_time: baseRecipe.baseCookTime,
        stir_frequency: baseRecipe.baseStirFrequency,
    };

    if (!taste) return params;

    // 口味修正 (示例逻辑，待实际对接调整)
    // 咸度: -2 ~ +2 对应盐量调整
    if (taste.salt !== undefined) {
        params.salt_modifier = taste.salt * 0.5; // 每级调整 0.5g 盐
    }

    // 辣度: 可能影响辣椒油/辣椒量 (待机器人支持)
    if (taste.spice !== undefined) {
        // params.spice_modifier = taste.spice * 0.3;
    }

    // 油量: 影响用油量
    if (taste.oil !== undefined) {
        params.oil_modifier = taste.oil * 2; // 每级调整 2ml 油
    }

    return params;
}

/**
 * 生成机器人指令
 * 将订单项转换为可发送给机器人的 JSON 指令
 */
export function generateRobotCommand(
    orderId: string,
    orderItemId: string,
    menuItemId: string,
    taste?: TasteModifier
): RobotCommand {
    const recipe = mockRecipes[menuItemId] || {
        recipeId: 'R999',
        dishName: '默认菜谱',
        baseTemperature: 170,
        baseCookTime: 120,
        baseStirFrequency: 2,
    };

    const gcodeParams = convertTasteToGCode(taste, recipe);

    return {
        id: `CMD_${Date.now()}`,
        order_id: orderId,
        order_item_id: orderItemId,
        menu_item_id: menuItemId,
        recipe_id: recipe.recipeId,
        gcode_params: gcodeParams,
        status: 'pending',
    };
}

/**
 * 发送指令到机器人
 * 预留接口 - 待对接实际通讯协议 (串口/WebSocket)
 */
export async function sendCommandToRobot(command: RobotCommand): Promise<{ success: boolean; error?: string }> {
    // 打印指令用于调试
    console.log('🤖 [Robot Service] Sending command:', JSON.stringify(command, null, 2));

    // TODO: 实际发送逻辑
    // 可能通过以下方式之一:
    // 1. WebSocket 连接到本地 Synapse Box
    // 2. HTTP API 调用后端，后端再通过串口发送
    // 3. MQTT 消息队列

    // 模拟发送成功
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ success: true });
        }, 500);
    });
}

/**
 * 批量发送订单中的所有菜品到机器人
 */
export async function sendOrderToRobot(
    orderId: string,
    items: Array<{
        orderItemId: string;
        menuItemId: string;
        taste?: TasteModifier;
    }>
): Promise<RobotCommand[]> {
    const commands: RobotCommand[] = [];

    for (const item of items) {
        const command = generateRobotCommand(
            orderId,
            item.orderItemId,
            item.menuItemId,
            item.taste
        );

        const result = await sendCommandToRobot(command);

        if (result.success) {
            command.status = 'sent';
            command.sent_at = new Date().toISOString();
        } else {
            command.status = 'error';
            command.error_message = result.error;
        }

        commands.push(command);
    }

    return commands;
}

export default {
    convertTasteToGCode,
    generateRobotCommand,
    sendCommandToRobot,
    sendOrderToRobot,
};
