/**
 * 机器人控制器核心实现
 * 📌 中国硬件团队维护
 * 🔲 全部待实现 — 以下是接口占位
 */

#include "robot_controller/robot_controller.h"
#include <iostream>

namespace synapse {

bool RobotController::connect(const std::string &serial_port) {
  // 🔲 待实现: 打开串口，建立通信
  // 建议使用 Boost.Asio 或 libserialport
  std::cout << "🔲 connect() 待实现 — 串口: " << serial_port << std::endl;
  return false;
}

void RobotController::disconnect() {
  // 🔲 待实现
  std::cout << "🔲 disconnect() 待实现" << std::endl;
}

bool RobotController::is_connected() const {
  return status_ != RobotStatus::OFFLINE;
}

bool RobotController::send_gcode(const std::string &gcode) {
  // 🔲 待实现: 通过串口发送 G-Code
  std::cout << "🔲 send_gcode() 待实现 — 指令: " << gcode << std::endl;
  return false;
}

bool RobotController::execute_sequence(
    const std::vector<std::string> &commands) {
  // 🔲 待实现: 逐条发送并等待确认
  std::cout << "🔲 execute_sequence() 待实现 — " << commands.size() << " 条指令"
            << std::endl;
  return false;
}

void RobotController::emergency_stop() {
  // 🔲 待实现: 紧急停止 — 需要硬件级别的快速响应
  // 优先级最高，直接发送 M112 (Emergency Stop)
  std::cout << "🚨 紧急停止! (emergency_stop) 待实现" << std::endl;
  status_ = RobotStatus::EMERGENCY_STOP;
}

RobotTelemetry RobotController::get_telemetry() const { return telemetry_; }

void RobotController::on_status_change(StatusCallback callback) {
  // 🔲 待实现: 注册回调，状态变化时通知
  std::cout << "🔲 on_status_change() 待实现" << std::endl;
}

void RobotController::start_grpc_server(int port) {
  // 🔲 待实现: 启动 gRPC 服务器
  // 参考 proto/synapse/v1/robot.proto
  std::cout << "🔲 gRPC 服务器待实现 — 端口: " << port << std::endl;
}

} // namespace synapse
