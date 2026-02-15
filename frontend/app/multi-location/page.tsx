'use client';

import { useState } from 'react';
import { MapPin, Store, TrendingUp, Users, DollarSign, Package, ArrowRight, Plus, Search } from 'lucide-react';

interface Location {
    id: string;
    name: string;
    address: string;
    status: 'active' | 'inactive' | 'closed';
    todayOrders: number;
    todayRevenue: number;
    staff: number;
    manager: string;
}

const mockLocations: Location[] = [
    {
        id: '1',
        name: '总店 - 王府井店',
        address: '北京市东城区王府井大街100号',
        status: 'active',
        todayOrders: 145,
        todayRevenue: 12580,
        staff: 25,
        manager: '张经理'
    },
    {
        id: '2',
        name: '朝阳店',
        address: '北京市朝阳区建国路50号',
        status: 'active',
        todayOrders: 98,
        todayRevenue: 8960,
        staff: 18,
        manager: '李经理'
    },
    {
        id: '3',
        name: '海淀店',
        address: '北京市海淀区中关村大街20号',
        status: 'active',
        todayOrders: 122,
        todayRevenue: 10200,
        staff: 20,
        manager: '王经理'
    },
    {
        id: '4',
        name: '西单店',
        address: '北京市西城区西单北大街50号',
        status: 'inactive',
        todayOrders: 0,
        todayRevenue: 0,
        staff: 15,
        manager: '刘经理'
    }
];

export default function MultiLocationPage() {
    const [locations, setLocations] = useState<Location[]>(mockLocations);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const totalStats = {
        totalLocations: locations.length,
        activeLocations: locations.filter(l => l.status === 'active').length,
        totalOrders: locations.reduce((sum, l) => sum + l.todayOrders, 0),
        totalRevenue: locations.reduce((sum, l) => sum + l.todayRevenue, 0),
        totalStaff: locations.reduce((sum, l) => sum + l.staff, 0)
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* 头部 */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">多店管理</h1>
                    <p className="text-gray-600 mt-1">
                        管理 {totalStats.totalLocations} 个门店，{totalStats.activeLocations} 个营业中
                    </p>
                </div>
                <div className="flex space-x-3">
                    <button className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 flex items-center">
                        <Search className="w-4 h-4 mr-2" />
                        搜索门店
                    </button>
                    <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center shadow-lg">
                        <Plus className="w-5 h-5 mr-2" />
                        添加门店
                    </button>
                </div>
            </div>

            {/* 全局统计 */}
            <div className="grid grid-cols-5 gap-4 mb-8">
                <StatCard
                    icon={Store}
                    label="门店总数"
                    value={totalStats.totalLocations}
                    color="bg-blue-500"
                />
                <StatCard
                    icon={Package}
                    label="今日订单"
                    value={totalStats.totalOrders}
                    color="bg-green-500"
                />
                <StatCard
                    icon={DollarSign}
                    label="今日营收"
                    value={`¥${totalStats.totalRevenue.toLocaleString()}`}
                    color="bg-purple-500"
                />
                <StatCard
                    icon={Users}
                    label="员工总数"
                    value={totalStats.totalStaff}
                    color="bg-orange-500"
                />
                <StatCard
                    icon={TrendingUp}
                    label="环比增长"
                    value="+12.5%"
                    color="bg-pink-500"
                />
            </div>

            {/* 门店网格/列表 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">门店列表</h2>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-4 py-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}
                        >
                            网格
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}
                        >
                            列表
                        </button>
                    </div>
                </div>

                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-3 gap-6">
                        {locations.map((location) => (
                            <LocationCard
                                key={location.id}
                                location={location}
                                onClick={() => setSelectedLocation(location)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {locations.map((location) => (
                            <LocationListItem
                                key={location.id}
                                location={location}
                                onClick={() => setSelectedLocation(location)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* 门店详情弹窗 */}
            {selectedLocation && (
                <LocationDetailModal
                    location={selectedLocation}
                    onClose={() => setSelectedLocation(null)}
                />
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color }: any) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="text-sm text-gray-600 mb-1">{label}</div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
        </div>
    );
}

function LocationCard({ location, onClick }: { location: Location; onClick: () => void }) {
    const statusColors = {
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-yellow-100 text-yellow-800',
        closed: 'bg-red-100 text-red-800'
    };

    return (
        <div
            onClick={onClick}
            className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 border-gray-100 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{location.name}</h3>
                    <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-1" />
                        {location.address}
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[location.status]}`}>
                    {location.status === 'active' ? '营业中' : location.status === 'inactive' ? '暂停' : '已关闭'}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-blue-600 mb-1">今日订单</div>
                    <div className="text-xl font-bold text-blue-900">{location.todayOrders}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs text-green-600 mb-1">今日营收</div>
                    <div className="text-xl font-bold text-green-900">¥{location.todayRevenue.toLocaleString()}</div>
                </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-600">
                    <Users className="w-4 h-4 inline mr-1" />
                    {location.staff} 名员工
                </div>
                <button className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium">
                    查看详情
                    <ArrowRight className="w-4 h-4 ml-1" />
                </button>
            </div>
        </div>
    );
}

function LocationListItem({ location, onClick }: { location: Location; onClick: () => void }) {
    const statusColors = {
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-yellow-100 text-yellow-800',
        closed: 'bg-red-100 text-red-800'
    };

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-lg p-6 border hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 flex-1">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{location.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                    </div>
                    <div className="text-center">
                        <div className="text-sm text-gray-600">今日订单</div>
                        <div className="text-xl font-bold text-gray-900">{location.todayOrders}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm text-gray-600">今日营收</div>
                        <div className="text-xl font-bold text-green-600">¥{location.todayRevenue.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm text-gray-600">员工</div>
                        <div className="text-xl font-bold text-gray-900">{location.staff}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm text-gray-600">经理</div>
                        <div className="text-sm font-medium text-gray-900">{location.manager}</div>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[location.status]}`}>
                        {location.status === 'active' ? '营业中' : location.status === 'inactive' ? '暂停' : '已关闭'}
                    </span>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
            </div>
        </div>
    );
}

function LocationDetailModal({ location, onClose }: { location: Location; onClose: () => void }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{location.name}</h2>
                        <p className="text-gray-600 mt-1">{location.address}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
                        ×
                    </button>
                </div>

                {/* 门店详细信息可以在这里展开 */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">今日订单</div>
                        <div className="text-3xl font-bold text-gray-900">{location.todayOrders}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">今日营收</div>
                        <div className="text-3xl font-bold text-green-600">¥{location.todayRevenue.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">员工数</div>
                        <div className="text-3xl font-bold text-gray-900">{location.staff}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
