// 串口通信实现占位 — 🔲 待中国团队实现
#include "robot_controller/serial_comm.h"
#include <iostream>
namespace synapse {
bool SerialComm::open(const std::string &port, int baud_rate) {
  std::cout << "🔲 SerialComm::open 待实现" << std::endl;
  return false;
}
void SerialComm::close() {}
bool SerialComm::is_open() const { return false; }
bool SerialComm::send(const std::string &data) { return false; }
std::string SerialComm::receive(int timeout_ms) { return ""; }
} // namespace synapse
