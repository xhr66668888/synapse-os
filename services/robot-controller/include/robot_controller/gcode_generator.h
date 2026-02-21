/**
 * G-Code 指令生成器
 * 将烹饪参数转换为机器人可执行的 G-Code 指令序列
 *
 * ==========================================
 * 此模块由中国硬件团队维护
 * ==========================================
 *
 * G-Code 约定:
 *   G28  - 归零 (机器人回到初始位置)
 *   G0   - 快速移动 (不加工)
 *   G1   - 线性移动 (翻炒动作)
 *   M104 - 设置油温 (S参数=温度°C)
 *   M109 - 等待油温到达目标 (S参数=温度°C)
 *   M106 - 设置火力 (S参数=0-255, 映射到1-10级)
 *   M107 - 关闭火力
 *   M84  - 关闭电机 (烹饪结束)
 *
 * 已实现: 基础指令生成框架
 * 待实现: 复杂翻炒路径规划
 * 待实现: 多菜品并行烹饪调度
 * 待实现: 基于口味偏好的参数调整 (需要与 taste-engine 联动)
 */

#pragma once

#include <string>
#include <vector>

namespace synapse {

class GCodeGenerator {
public:
  GCodeGenerator() = default;

  /**
   * 生成翻炒指令序列
   *
   * @param oil_temp_celsius 目标油温 (摄氏度, 例如 180.0)
   * @param stir_duration_sec 翻炒持续时间 (秒)
   * @param heat_level 火力等级 (1-10)
   * @return G-Code 指令序列
   *
   * 已实现 (基础版本)
   */
  std::vector<std::string> generate_stir_fry(double oil_temp_celsius,
                                             int stir_duration_sec,
                                             int heat_level) const;

  /**
   * 生成加料指令
   * 控制机器人从配料盒取料并加入锅中
   *
   * @param ingredient_slot 配料槽位编号 (0-7)
   * @param amount_grams 用量 (克)
   * @return G-Code 指令序列
   *
   * 待实现
   */
  std::vector<std::string> generate_add_ingredient(int ingredient_slot,
                                                   double amount_grams) const;

  /**
   * 生成装盘指令
   * 控制机器人将菜品从锅中转移到盘中
   *
   * 待实现
   */
  std::vector<std::string> generate_plate() const;

  /**
   * 生成清洗指令
   * 烹饪完成后自动清洗锅具
   *
   * 待实现
   */
  std::vector<std::string> generate_clean() const;

  /**
   * 根据口味偏好调整烹饪参数
   * 需要从 taste-engine (C++) 获取用户口味数据
   *
   * @param user_id 用户 ID
   * @param base_commands 基础指令序列
   * @return 调整后的指令序列
   *
   * 待实现 (需要与 taste-engine 联动)
   */
  std::vector<std::string>
  adjust_for_taste(const std::string &user_id,
                   const std::vector<std::string> &base_commands) const;

private:
  /**
   * 将火力等级 (1-10) 映射到 PWM 值 (0-255)
   */
  int heat_to_pwm(int heat_level) const {
    return std::min(255, std::max(0, heat_level * 25));
  }
};

} // namespace synapse
