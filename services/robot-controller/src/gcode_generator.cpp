/**
 * G-Code 指令生成器实现
 * 📌 中国硬件团队维护
 */

#include "robot_controller/gcode_generator.h"
#include <sstream>

namespace synapse {

std::vector<std::string>
GCodeGenerator::generate_stir_fry(double oil_temp_celsius,
                                  int stir_duration_sec, int heat_level) const {
  std::vector<std::string> commands;

  // 1. 归零
  commands.push_back("G28 ; 机器人归零");

  // 2. 设置火力
  int pwm = heat_to_pwm(heat_level);
  commands.push_back("M106 S" + std::to_string(pwm) + " ; 设置火力等级 " +
                     std::to_string(heat_level));

  // 3. 设置目标油温并等待
  std::ostringstream temp_cmd;
  temp_cmd << "M109 S" << oil_temp_celsius << " ; 等待油温到达 "
           << oil_temp_celsius << "°C";
  commands.push_back(temp_cmd.str());

  // 4. 翻炒动作序列
  // 🔲 当前使用简单的左右往复运动
  // TODO: 实现更复杂的翻炒路径 (圆弧、抛锅等)
  int cycles = stir_duration_sec / 2; // 每个翻炒周期约2秒
  for (int i = 0; i < cycles; ++i) {
    commands.push_back("G1 X100 Y0 F3000 ; 翻炒-右");
    commands.push_back("G1 X-100 Y0 F3000 ; 翻炒-左");
  }

  // 5. 关闭火力
  commands.push_back("M107 ; 关闭火力");

  // 6. 回到待机位置
  commands.push_back("G0 X0 Y0 Z50 ; 回到待机位");

  return commands;
}

std::vector<std::string>
GCodeGenerator::generate_add_ingredient(int ingredient_slot,
                                        double amount_grams) const {
  // 🔲 待实现: 控制配料分发机构
  // 需要根据实际机器人硬件定义以下参数:
  //   - 配料槽位的物理坐标
  //   - 分发阀门的 PWM 控制
  //   - 称重传感器反馈
  return {"G0 ; 加料功能待实现 - 等待硬件对接"};
}

std::vector<std::string> GCodeGenerator::generate_plate() const {
  // 🔲 待实现: 装盘动作
  return {"G0 ; 装盘功能待实现 - 等待硬件对接"};
}

std::vector<std::string> GCodeGenerator::generate_clean() const {
  // 🔲 待实现: 清洗流程
  return {"G0 ; 清洗功能待实现 - 等待硬件对接"};
}

std::vector<std::string> GCodeGenerator::adjust_for_taste(
    const std::string &user_id,
    const std::vector<std::string> &base_commands) const {
  // 🔲 待实现
  // 需要:
  //   1. 通过 gRPC 调用 taste-engine 获取用户口味偏好
  //   2. 根据偏好调整: 油温、火力、时间、调料用量
  //   3. 返回调整后的指令序列
  return base_commands; // 暂时原样返回
}

} // namespace synapse
