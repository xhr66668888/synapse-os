'use client';

import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingDown, Plus, Truck, ClipboardList, Search, RefreshCw } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  low_stock_threshold: number;
  cost_per_unit: number;
  is_low_stock: boolean;
}

interface LowStockAlert {
  ingredient_id: string;
  ingredient_name: string;
  current_stock: number;
  low_stock_threshold: number;
  unit: string;
}

interface Supplier {
  id: string;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  status: string;
  total: number;
  created_at: string;
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'alerts' | 'suppliers' | 'orders'>('ingredients');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'ingredients') {
        setIngredients([
          { id: '1', name: '牛肉', unit: 'kg', current_stock: 15, low_stock_threshold: 20, cost_per_unit: 45, is_low_stock: true },
          { id: '2', name: '鸡肉', unit: 'kg', current_stock: 30, low_stock_threshold: 15, cost_per_unit: 25, is_low_stock: false },
          { id: '3', name: '蔬菜', unit: 'kg', current_stock: 5, low_stock_threshold: 10, cost_per_unit: 8, is_low_stock: true },
          { id: '4', name: '米饭', unit: 'kg', current_stock: 50, low_stock_threshold: 20, cost_per_unit: 5, is_low_stock: false },
          { id: '5', name: '酱油', unit: 'L', current_stock: 3, low_stock_threshold: 5, cost_per_unit: 12, is_low_stock: true },
          { id: '6', name: '食用油', unit: 'L', current_stock: 25, low_stock_threshold: 10, cost_per_unit: 15, is_low_stock: false },
          { id: '7', name: '大蒜', unit: 'kg', current_stock: 8, low_stock_threshold: 5, cost_per_unit: 10, is_low_stock: false },
          { id: '8', name: '生姜', unit: 'kg', current_stock: 4, low_stock_threshold: 3, cost_per_unit: 12, is_low_stock: false },
        ]);
      } else if (activeTab === 'alerts') {
        setAlerts([
          { ingredient_id: '1', ingredient_name: '牛肉', current_stock: 15, low_stock_threshold: 20, unit: 'kg' },
          { ingredient_id: '3', ingredient_name: '蔬菜', current_stock: 5, low_stock_threshold: 10, unit: 'kg' },
          { ingredient_id: '5', ingredient_name: '酱油', current_stock: 3, low_stock_threshold: 5, unit: 'L' },
        ]);
      } else if (activeTab === 'suppliers') {
        setSuppliers([
          { id: '1', name: '优质肉类供应商', contact_name: '张经理', phone: '13800138001', email: 'zhang@meat.com' },
          { id: '2', name: '新鲜蔬菜批发', contact_name: '李老板', phone: '13900139002', email: 'li@veggie.com' },
          { id: '3', name: '调料综合商行', contact_name: '王师傅', phone: '13700137003', email: 'wang@spice.com' },
        ]);
      } else if (activeTab === 'orders') {
        setPurchaseOrders([
          { id: '1', order_number: 'PO-20240115-A1B2', supplier_id: '1', status: 'ordered', total: 2500, created_at: '2024-01-15T10:00:00Z' },
          { id: '2', order_number: 'PO-20240114-C3D4', supplier_id: '2', status: 'received', total: 800, created_at: '2024-01-14T09:00:00Z' },
          { id: '3', order_number: 'PO-20240113-E5F6', supplier_id: '3', status: 'pending', total: 350, created_at: '2024-01-13T14:00:00Z' },
        ]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: 'ingredients', label: '原料库存', icon: Package },
    { id: 'alerts', label: '库存预警', icon: AlertTriangle, badge: alerts.length },
    { id: 'suppliers', label: '供应商', icon: Truck },
    { id: 'orders', label: '采购订单', icon: ClipboardList },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">库存管理</h1>
          <p className="text-text-secondary">管理原料库存、供应商和采购订单</p>
        </div>
        <button className="btn btn-secondary">
          <RefreshCw className="w-4 h-4" />
          刷新数据
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="card p-1 flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:bg-bg-hover'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge && tab.badge > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-red-500 text-white'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'ingredients' && (
        <div className="card">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="搜索原料..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg border border-border bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
              />
            </div>
            <button className="btn btn-primary">
              <Plus className="w-4 h-4" />
              添加原料
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">原料名称</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">当前库存</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">预警阈值</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">单位成本</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredIngredients.map((ingredient) => (
                  <tr key={ingredient.id} className="hover:bg-bg-hover transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">{ingredient.name}</td>
                    <td className="px-4 py-3 text-text-primary">
                      {ingredient.current_stock} {ingredient.unit}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {ingredient.low_stock_threshold} {ingredient.unit}
                    </td>
                    <td className="px-4 py-3 text-text-primary">¥{ingredient.cost_per_unit}</td>
                    <td className="px-4 py-3">
                      {ingredient.is_low_stock ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1 w-fit">
                          <TrendingDown className="w-3 h-3" />
                          库存不足
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          正常
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-primary hover:underline text-sm">
                        编辑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="card p-12 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-text-muted">暂无库存预警</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.ingredient_id}
                className="card p-4 flex items-center justify-between border-l-4 border-l-red-500"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-text-primary">{alert.ingredient_name}</h3>
                    <p className="text-sm text-text-muted">
                      当前: <span className="text-red-500 font-medium">{alert.current_stock} {alert.unit}</span> / 
                      阈值: {alert.low_stock_threshold} {alert.unit}
                    </p>
                  </div>
                </div>
                <button className="btn btn-primary">
                  立即采购
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="card">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="font-medium text-text-primary">供应商列表</h3>
            <button className="btn btn-primary">
              <Plus className="w-4 h-4" />
              添加供应商
            </button>
          </div>
          <div className="divide-y divide-border">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="p-4 flex items-center justify-between hover:bg-bg-hover transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary">{supplier.name}</h4>
                    <p className="text-sm text-text-muted">
                      {supplier.contact_name} · {supplier.phone}
                    </p>
                  </div>
                </div>
                <button className="text-primary hover:underline text-sm">
                  查看详情
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="card">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="font-medium text-text-primary">采购订单</h3>
            <button className="btn btn-primary">
              <Plus className="w-4 h-4" />
              新建采购单
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">订单号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">金额</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">创建时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-bg-hover transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-text-primary">{po.order_number}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        po.status === 'received' 
                          ? 'bg-green-100 text-green-700'
                          : po.status === 'ordered'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {po.status === 'received' ? '已收货' : po.status === 'ordered' ? '已下单' : '待处理'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-primary">¥{po.total}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {new Date(po.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-primary hover:underline text-sm">
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
