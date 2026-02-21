/**
 * 机器人控制器核心类
 * 📌 中国硬件团队维护
 *
 * 职责:
 *   - 管理与物理机器人的连接 (串口/TCP)
 *   - 接收 gRPC 指令并转发给机器人
 *   - 监控机器人状态 (温度、位置、错误)
 *   - 安全熔断 (温度超限、机械故障时紧急停止)
 */

#pragma once

#include <functional>
#include <string>

namespace synapse {

/// 机器人状态
enum class RobotStatus {
  OFFLINE,       // 未连接
  IDLE,          // 就绪，等待指令
  COOKING,       // 烹饪中
  CLEANING,      // 清洗中
  ERROR,         // 故障
  EMERGENCY_STOP // 紧急停止
};

/// 机器人遥测数据
struct RobotTelemetry {
  double oil_temperature;    // 当前油温 (°C)
  double target_temperature; // 目标油温 (°C)
  int heat_level;            // 当前火力 (1-10)
  double position_x;         // 当前 X 坐标
  double position_y;         // 当前 Y 坐标
  double position_z;         // 当前 Z 坐标
  RobotStatus status;        // 当前状态
  std::string error_message; // 错误信息 (如有)
};

/// 状态回调类型
using StatusCallback = std::function<void(const RobotTelemetry &)>;

class RobotController {
public:
  RobotController() = default;
  ~RobotController() = default;

  // ==========================================
  // 连接管理 🔲 全部待实现
  // ==========================================

  /**
   * 连接到物理机器人
   * @param serial_port 串口设备 (例如 /dev/ttyUSB0)
   * @return 是否连接成功
   *
   * 🔲 待实现 — 需要根据机器人通信协议实现
   */
  bool connect(const std::string &serial_port);

  /**
   * 断开连接
   * 🔲 待实现
   */
  void disconnect();

  /**
   * 检查连接状态
   * 🔲 待实现
   */
  bool is_connected() const;

  // ==========================================
  // 指令执行 🔲 全部待实现
  // ==========================================

  /**
   * 发送 G-Code 指令
   * @param gcode G-Code 指令字符串
   * @return 是否发送成功
   *
   * 🔲 待实现 — 通过串口发送
   */
  bool send_gcode(const std::string &gcode);

  /**
   * 执行一组 G-Code 指令序列
   * @param commands 指令列表
   * @return 是否全部执行成功
   *
   * 🔲 待实现 — 需要处理指令间的时序和等待
   */
  bool execute_sequence(const std::vector<std::string> &commands);

  /**
   * 紧急停止
   * 立即停止所有动作，关闭火力
   * 优先级最高，任何时刻都可以调用
   *
   * 🔲 待实现
   */
  void emergency_stop();

  // ==========================================
  // 状态监控 🔲 全部待实现
  // ==========================================

  /**
   * 获取当前遥测数据
   * 🔲 待实现
   */
  RobotTelemetry get_telemetry() const;

  /**
   * 注册状态回调
   * 用于将遥测数据实时推送到前端 (通过 gRPC Stream → event-bus)
   *
   * @param callback 回调函数，每当状态变化时被调用
   *
   * 🔲 待实现
   */
  void on_status_change(StatusCallback callback);

  // ==========================================
  // gRPC 服务器 🔲 待实现
  // ==========================================

  /**
   * 启动 gRPC 服务器
   * 监听来自 Go 网关的烹饪指令
   *
   * @param port gRPC 端口 (默认 50054)
   *
   * 🔲 待实现 — proto 定义在 proto/synapse/v1/robot.proto
   */
  void start_grpc_server(int port);

private:
  RobotStatus status_ = RobotStatus::OFFLINE;
  RobotTelemetry telemetry_{};
  // 🔲 串口连接句柄
  // 🔲 gRPC 服务器实例
};

} // namespace synapse
