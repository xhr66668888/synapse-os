import React, { useState } from 'react';
import './Staff.css';

// 模拟员工数据
const mockStaff = [
    {
        id: 'S001',
        name: '王小明',
        role: '厨师长',
        phone: '138****1234',
        status: 'working',
        shift: '09:00 - 17:00',
        hoursThisWeek: 42,
        avatar: '王'
    },
    {
        id: 'S002',
        name: 'Lisa Chen',
        role: '收银员',
        phone: '139****5678',
        status: 'working',
        shift: '10:00 - 18:00',
        hoursThisWeek: 38,
        avatar: 'L'
    },
    {
        id: 'S003',
        name: '张伟',
        role: '服务员',
        phone: '136****9012',
        status: 'break',
        shift: '11:00 - 19:00',
        hoursThisWeek: 35,
        avatar: '张'
    },
    {
        id: 'S004',
        name: 'Mike Wang',
        role: '厨师',
        phone: '137****3456',
        status: 'off',
        shift: '休息',
        hoursThisWeek: 40,
        avatar: 'M'
    },
    {
        id: 'S005',
        name: '李娜',
        role: '服务员',
        phone: '135****7890',
        status: 'working',
        shift: '12:00 - 20:00',
        hoursThisWeek: 32,
        avatar: '李'
    },
];

// 本周排班
const weekSchedule = [
    { day: '周一', date: '01/27', shifts: ['王小明', 'Lisa Chen', '张伟'] },
    { day: '周二', date: '01/28', shifts: ['王小明', 'Lisa Chen', 'Mike Wang', '李娜'] },
    { day: '周三', date: '01/29', shifts: ['王小明', '张伟', '李娜'] },
    { day: '周四', date: '01/30', shifts: ['Mike Wang', 'Lisa Chen', '张伟'] },
    { day: '周五', date: '01/31', shifts: ['王小明', 'Lisa Chen', '张伟', '李娜'] },
    { day: '周六', date: '02/01', shifts: ['王小明', 'Mike Wang', '张伟', '李娜'] },
    { day: '周日', date: '02/02', shifts: ['Lisa Chen', '李娜'] },
];

// 最近打卡记录
const clockRecords = [
    { name: '王小明', action: 'in', time: '09:02', date: '今天' },
    { name: 'Lisa Chen', action: 'in', time: '09:58', date: '今天' },
    { name: '张伟', action: 'in', time: '11:05', date: '今天' },
    { name: '李娜', action: 'in', time: '11:55', date: '今天' },
    { name: '张伟', action: 'break', time: '14:30', date: '今天' },
];

const roleColors: Record<string, string> = {
    '厨师长': '#FF9500',
    '厨师': '#FF3B30',
    '收银员': '#007AFF',
    '服务员': '#34C759',
    '经理': '#AF52DE',
};

export const Staff: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'list' | 'schedule' | 'clock'>('list');
    const workingCount = mockStaff.filter(s => s.status === 'working').length;

    return (
        <div className="staff-page page">
            <header className="page-header">
                <div className="container flex-between">
                    <div>
                        <h1 className="page-title">员工管理</h1>
                        <p className="page-subtitle">
                            当前在岗 <span className="highlight">{workingCount}</span> 人 / 共 {mockStaff.length} 人
                        </p>
                    </div>
                    <button className="btn btn-primary">
                        <span className="btn-icon">+</span>
                        添加员工
                    </button>
                </div>
            </header>

            <div className="page-content">
                <div className="container">
                    {/* 标签页 */}
                    <div className="tabs-nav">
                        <button
                            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
                            onClick={() => setActiveTab('list')}
                        >
                            <img src="/assets/icon-profile-new.png" alt="" style={{ width: 18, opacity: 0.7 }} />
                            员工列表
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
                            onClick={() => setActiveTab('schedule')}
                        >
                            <img src="/assets/icon-orders-new.png" alt="" style={{ width: 18, opacity: 0.7 }} />
                            排班表
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'clock' ? 'active' : ''}`}
                            onClick={() => setActiveTab('clock')}
                        >
                            <img src="/assets/icon-kds-new.png" alt="" style={{ width: 18, opacity: 0.7 }} />
                            打卡记录
                        </button>
                    </div>

                    {/* 员工列表 */}
                    {activeTab === 'list' && (
                        <div className="staff-list card">
                            <table className="staff-table">
                                <thead>
                                    <tr>
                                        <th>员工</th>
                                        <th>角色</th>
                                        <th>电话</th>
                                        <th>今日班次</th>
                                        <th>本周工时</th>
                                        <th>状态</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mockStaff.map(staff => (
                                        <tr key={staff.id}>
                                            <td>
                                                <div className="staff-cell">
                                                    <div className="staff-avatar">{staff.avatar}</div>
                                                    <span className="staff-name">{staff.name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span
                                                    className="role-badge"
                                                    style={{ backgroundColor: `${roleColors[staff.role]}20`, color: roleColors[staff.role] }}
                                                >
                                                    {staff.role}
                                                </span>
                                            </td>
                                            <td className="text-muted">{staff.phone}</td>
                                            <td>{staff.shift}</td>
                                            <td>{staff.hoursThisWeek}h</td>
                                            <td>
                                                <span className={`status-badge ${staff.status}`}>
                                                    {staff.status === 'working' && '在岗'}
                                                    {staff.status === 'break' && '休息中'}
                                                    {staff.status === 'off' && '未上班'}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn btn-ghost btn-sm">编辑</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* 排班表 */}
                    {activeTab === 'schedule' && (
                        <div className="schedule-grid card">
                            <div className="schedule-header">
                                <h3>2026年1月 第5周</h3>
                                <div className="schedule-nav">
                                    <button className="btn btn-ghost btn-sm">上周</button>
                                    <button className="btn btn-ghost btn-sm">下周</button>
                                </div>
                            </div>
                            <div className="schedule-days">
                                {weekSchedule.map(day => (
                                    <div key={day.day} className="schedule-day">
                                        <div className="day-header">
                                            <span className="day-name">{day.day}</span>
                                            <span className="day-date">{day.date}</span>
                                        </div>
                                        <div className="day-shifts">
                                            {day.shifts.map(name => (
                                                <div key={name} className="shift-chip">
                                                    {name.charAt(0)}
                                                    <span className="shift-name">{name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 打卡记录 */}
                    {activeTab === 'clock' && (
                        <div className="clock-records card">
                            <div className="card-header">
                                <h3>今日打卡</h3>
                                <span className="text-muted">2026-01-28</span>
                            </div>
                            <div className="records-list">
                                {clockRecords.map((record, idx) => (
                                    <div key={idx} className="record-row">
                                        <div className="record-avatar">{record.name.charAt(0)}</div>
                                        <span className="record-name">{record.name}</span>
                                        <span className={`record-action ${record.action}`}>
                                            {record.action === 'in' && '上班打卡'}
                                            {record.action === 'out' && '下班打卡'}
                                            {record.action === 'break' && '休息'}
                                        </span>
                                        <span className="record-time">{record.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Staff;
