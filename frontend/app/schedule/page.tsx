'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, DollarSign, Plus, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

interface ScheduleItem {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'no_show';
}

interface TimeEntryItem {
  id: string;
  staffId: string;
  staffName: string;
  clockIn: string;
  clockOut?: string;
  hoursWorked: number;
  tips: number;
}

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'timesheet' | 'tips'>('schedule');
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryItem[]>([]);

  function getMonday(d: Date) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  function getWeekDates(monday: Date) {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  const weekDates = getWeekDates(currentWeekStart);
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  useEffect(() => {
    setSchedules([
      { id: '1', staffId: 's1', staffName: '张伟', role: 'SERVER', date: weekDates[0].toISOString().split('T')[0], startTime: '10:00', endTime: '18:00', status: 'confirmed' },
      { id: '2', staffId: 's2', staffName: '李娜', role: 'SERVER', date: weekDates[0].toISOString().split('T')[0], startTime: '14:00', endTime: '22:00', status: 'scheduled' },
      { id: '3', staffId: 's3', staffName: '王强', role: 'CHEF', date: weekDates[1].toISOString().split('T')[0], startTime: '08:00', endTime: '16:00', status: 'confirmed' },
      { id: '4', staffId: 's1', staffName: '张伟', role: 'SERVER', date: weekDates[2].toISOString().split('T')[0], startTime: '10:00', endTime: '18:00', status: 'scheduled' },
      { id: '5', staffId: 's4', staffName: '赵敏', role: 'HOST', date: weekDates[3].toISOString().split('T')[0], startTime: '11:00', endTime: '19:00', status: 'scheduled' },
      { id: '6', staffId: 's5', staffName: '刘洋', role: 'CASHIER', date: weekDates[4].toISOString().split('T')[0], startTime: '09:00', endTime: '17:00', status: 'scheduled' },
      { id: '7', staffId: 's3', staffName: '王强', role: 'CHEF', date: weekDates[5].toISOString().split('T')[0], startTime: '10:00', endTime: '20:00', status: 'scheduled' },
    ]);

    setTimeEntries([
      { id: 't1', staffId: 's1', staffName: '张伟', clockIn: '2024-01-15T10:02:00', clockOut: '2024-01-15T18:05:00', hoursWorked: 8.05, tips: 125 },
      { id: 't2', staffId: 's2', staffName: '李娜', clockIn: '2024-01-15T14:00:00', clockOut: '2024-01-15T22:10:00', hoursWorked: 8.17, tips: 98 },
      { id: 't3', staffId: 's3', staffName: '王强', clockIn: '2024-01-15T08:00:00', hoursWorked: 0, tips: 0 },
      { id: 't4', staffId: 's4', staffName: '赵敏', clockIn: '2024-01-15T11:05:00', clockOut: '2024-01-15T19:00:00', hoursWorked: 7.92, tips: 85 },
    ]);
  }, [currentWeekStart]);

  const getSchedulesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter(s => s.date === dateStr);
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + (direction * 7));
    setCurrentWeekStart(newDate);
  };

  const roleColors: Record<string, string> = {
    SERVER: 'bg-blue-100 text-blue-700',
    CHEF: 'bg-orange-100 text-orange-700',
    HOST: 'bg-purple-100 text-purple-700',
    MANAGER: 'bg-green-100 text-green-700',
    CASHIER: 'bg-pink-100 text-pink-700',
  };

  const roleLabels: Record<string, string> = {
    SERVER: '服务员',
    CHEF: '厨师',
    HOST: '领位',
    MANAGER: '经理',
    CASHIER: '收银',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">员工排班</h1>
          <p className="text-text-secondary">管理员工排班、考勤和小费分配</p>
        </div>
        <button className="btn btn-secondary">
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="card p-1 flex gap-1">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
            activeTab === 'schedule' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:bg-bg-hover'
          }`}
        >
          <Calendar className="w-4 h-4" />
          排班表
        </button>
        <button
          onClick={() => setActiveTab('timesheet')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
            activeTab === 'timesheet' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:bg-bg-hover'
          }`}
        >
          <Clock className="w-4 h-4" />
          考勤记录
        </button>
        <button
          onClick={() => setActiveTab('tips')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
            activeTab === 'tips' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:bg-bg-hover'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          小费分配
        </button>
      </div>

      {/* Schedule View */}
      {activeTab === 'schedule' && (
        <div className="card">
          {/* Week Navigation */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateWeek(-1)}
                className="p-2 hover:bg-bg-hover rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-text-secondary" />
              </button>
              <h3 className="font-medium text-text-primary">
                {currentWeekStart.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} - 
                {weekDates[6].toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
              </h3>
              <button
                onClick={() => navigateWeek(1)}
                className="p-2 hover:bg-bg-hover rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
            <button className="btn btn-primary">
              <Plus className="w-4 h-4" />
              添加排班
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 divide-x divide-border">
            {weekDates.map((date, index) => {
              const daySchedules = getSchedulesForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <div key={index} className="min-h-[320px]">
                  <div className={`p-3 text-center border-b border-border ${isToday ? 'bg-primary/5' : ''}`}>
                    <div className="text-sm text-text-muted">{dayNames[index]}</div>
                    <div className={`text-lg font-semibold ${isToday ? 'text-primary' : 'text-text-primary'}`}>
                      {date.getDate()}
                    </div>
                  </div>
                  <div className="p-2 space-y-2">
                    {daySchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="p-2 rounded-lg bg-bg-secondary hover:bg-bg-hover cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${roleColors[schedule.role] || 'bg-gray-100'}`}>
                            {roleLabels[schedule.role] || schedule.role}
                          </span>
                        </div>
                        <div className="font-medium text-sm text-text-primary">{schedule.staffName}</div>
                        <div className="text-xs text-text-muted">
                          {schedule.startTime} - {schedule.endTime}
                        </div>
                      </div>
                    ))}
                    {daySchedules.length === 0 && (
                      <div className="text-center text-text-muted text-sm py-8">
                        暂无排班
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timesheet View */}
      {activeTab === 'timesheet' && (
        <div className="card">
          <div className="p-4 border-b border-border">
            <h3 className="font-medium text-text-primary">今日考勤</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">员工</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">上班打卡</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">下班打卡</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">工时</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">小费</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {timeEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-bg-hover transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">{entry.staffName}</td>
                    <td className="px-4 py-3 text-text-primary">
                      {new Date(entry.clockIn).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {entry.clockOut 
                        ? new Date(entry.clockOut).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                        : <span className="text-text-muted">-</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {entry.hoursWorked > 0 ? `${entry.hoursWorked.toFixed(1)} 小时` : '-'}
                    </td>
                    <td className="px-4 py-3 text-text-primary">¥{entry.tips}</td>
                    <td className="px-4 py-3">
                      {entry.clockOut ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          已下班
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          工作中
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tips Distribution View */}
      {activeTab === 'tips' && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium text-text-primary">今日小费池</h3>
              <button className="btn btn-primary">
                分配小费
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                <div className="text-sm text-green-700">总小费</div>
                <div className="text-3xl font-bold text-green-600">¥523</div>
              </div>
              <div className="p-4 rounded-xl bg-bg-secondary">
                <div className="text-sm text-text-muted">现金小费</div>
                <div className="text-2xl font-bold text-text-primary">¥180</div>
              </div>
              <div className="p-4 rounded-xl bg-bg-secondary">
                <div className="text-sm text-text-muted">刷卡小费</div>
                <div className="text-2xl font-bold text-text-primary">¥343</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-4 border-b border-border">
              <h3 className="font-medium text-text-primary">分配详情</h3>
            </div>
            <div className="divide-y divide-border">
              {timeEntries.filter(e => e.clockOut).map((entry) => (
                <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-bg-hover transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">{entry.staffName}</div>
                      <div className="text-sm text-text-muted">{entry.hoursWorked.toFixed(1)} 小时</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">¥{entry.tips}</div>
                    <div className="text-sm text-text-muted">
                      ¥{(entry.tips / entry.hoursWorked).toFixed(2)}/小时
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
