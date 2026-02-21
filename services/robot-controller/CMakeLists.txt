# ==========================================
# Synapse OS — 炒菜机器人控制器
# Robot Controller (C++ 17)
#
# 📌 此模块由中国硬件团队维护
# 📌 负责: G-Code 指令生成、实时机器通信、温控、翻炒控制
# 📌 通信: gRPC (与 Go 网关) + TCP/Serial (与物理机器人)
# ==========================================

cmake_minimum_required(VERSION 3.20)
project(robot_controller
    VERSION 0.1.0
    DESCRIPTION "Synapse OS 炒菜机器人控制器 — 实时 G-Code 控制"
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# ==========================================
# 依赖项
# ==========================================

# gRPC (与上游服务通信)
# find_package(gRPC REQUIRED)    # 🔲 需要安装 gRPC C++ 库
# find_package(Protobuf REQUIRED) # 🔲 需要安装 protobuf

# Boost (串口通信、异步 I/O)
# find_package(Boost REQUIRED COMPONENTS system serialization)

# ==========================================
# 源文件
# ==========================================

set(SOURCES
    src/main.cpp
    src/robot_controller.cpp
    src/gcode_generator.cpp
    src/serial_comm.cpp
)

set(HEADERS
    include/robot_controller/robot_controller.h
    include/robot_controller/gcode_generator.h
    include/robot_controller/serial_comm.h
    include/robot_controller/types.h
)

# ==========================================
# 构建目标
# ==========================================

add_executable(${PROJECT_NAME} ${SOURCES} ${HEADERS})

target_include_directories(${PROJECT_NAME}
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# target_link_libraries(${PROJECT_NAME}
#     PUBLIC
#         gRPC::grpc++
#         protobuf::libprotobuf
#         Boost::system
# )

# ==========================================
# 安装规则
# ==========================================

install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION bin
)

# ==========================================
# 测试 (CTest)
# ==========================================

enable_testing()
# add_subdirectory(tests)  # 🔲 待创建测试目录
