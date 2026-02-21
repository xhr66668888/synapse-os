/**
 * 串口通信模块
 * 📌 中国硬件团队维护
 * 🔲 完全待实现
 *
 * 负责与物理炒菜机器人的底层通信
 * 通信方式: RS-232 串口 或 TCP Socket
 */

#pragma once

#include <string>

namespace synapse {

/// 串口通信 🔲 待实现
class SerialComm {
public:
  bool open(const std::string &port, int baud_rate = 115200);
  void close();
  bool is_open() const;
  bool send(const std::string &data);
  std::string receive(int timeout_ms = 1000);
};

} // namespace synapse
