import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTenantPath } from "@/contexts/TenantContext";
import { api, ApiProduct, MonthlyData, TopProduct, SalesSummary } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { Package, TrendingUp, Plus, DollarSign, ArrowUp, ArrowDown, Activity } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTheme } from "@/contexts/ThemeContext";
import { formatCurrencySync } from "@/utils/currency";

// useTenantPath is called inside the component below
function compactNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + "K";
  return n.toLocaleString();
}

export default function Dashboard() {
  const tp = useTenantPath();
  const { baseCurrency } = useCurrency();
  const { theme } = useTheme("admin");
  // The charts used to hardcode dark-only colors (near-black grid/tooltip, a raw
  // neon #00ff00 line/bar) — the grid/tooltip now follow the theme (a dark tooltip
  // box floating on a light page looked broken). The line/bar color is requested
  // to stay the original neon green in dark mode; only light mode gets the teal.
  const chartAccent = theme === "light" ? "#00A896" : "#00ff00";
  const chartGrid = theme === "light" ? "#e2e8f0" : "#333333";
  const chartAxis = theme === "light" ? "#64748b" : "#888888";
  const chartTooltipBg = theme === "light" ? "#ffffff" : "#1a1a1a";
  const chartTooltipBorder = theme === "light" ? "#e2e8f0" : "#333333";
  const chartTooltipText = theme === "light" ? "#334155" : "#ededed";
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [monthlySales, setMonthlySales] = useState<MonthlyData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [p, sales, monthly, topProds, summary] = await Promise.all([
        api.products.list(),
        api.pos.getSales().catch(() => []),
        api.dashboard.monthlySales().catch(() => []),
        api.dashboard.topProducts(5).catch(() => []),
        api.dashboard.salesSummary().catch(() => null)
      ]);

      setProducts(p);
      setSalesData(sales);
      setMonthlySales(monthly);
      setTopProducts(topProds);
      setSalesSummary(summary);
      
      // Calculate financial metrics
      const _sales = sales as any[];
      const totalRevenue = _sales.reduce((sum: number, sale) => sum + Number(sale.total_amount || 0), 0);
      const totalCost = _sales.reduce((sum: number, sale) => sum + Number(sale.subtotal || 0), 0);
      const totalTax = _sales.reduce((sum: number, sale) => sum + Number(sale.tax_amount || 0), 0);
      const totalDiscount = _sales.reduce((sum: number, sale) => sum + Number(sale.discount_amount || 0), 0);

      // Get today's sales
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySales = sales.filter((s: any) => new Date(s.created_at) >= today);
      const todayRevenue = todaySales.reduce((sum: number, sale: any) => sum + Number(sale.total_amount || 0), 0);

      // Get yesterday's sales for comparison
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdaySales = sales.filter((s: any) => {
        const saleDate = new Date(s.created_at);
        return saleDate >= yesterday && saleDate < today;
      });
      const yesterdayRevenue = yesterdaySales.reduce((sum: number, sale: any) => sum + Number(sale.total_amount || 0), 0);
      
      const revenueChange = yesterdayRevenue > 0 
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
        : 0;
      
      setFinancialData({
        totalRevenue,
        totalCost,
        totalTax,
        totalDiscount,
        todayRevenue,
        yesterdayRevenue,
        revenueChange,
        totalSales: sales.length,
        todaySales: todaySales.length,
        averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Overview</p>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          </div>
          <Link
            to={tp("/admin/products/new")}
            className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            Add Product
          </Link>
        </div>

        {loading ? (
          <div className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
            Loading…
          </div>
        ) : (
          <>
            {/* Financial Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="border border-border-subtle bg-chassis p-6">
                <div className="flex items-center gap-3 mb-3">
                  <DollarSign size={16} className="text-primary" />
                  <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">Total Revenue</span>
                </div>
                <p className="text-3xl font-bold text-foreground font-mono">{formatCurrencySync(financialData?.totalRevenue || 0, baseCurrency?.symbol || 'UGX', false)}</p>
                <div className="flex items-center gap-2 mt-2">
                  {financialData?.revenueChange >= 0 ? (
                    <ArrowUp size={14} className="text-green-500" />
                  ) : (
                    <ArrowDown size={14} className="text-red-500" />
                  )}
                  <span className={`text-xs font-mono-tech ${financialData?.revenueChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.abs(financialData?.revenueChange || 0).toFixed(1)}% vs yesterday
                  </span>
                </div>
              </div>
              
              <div className="border border-border-subtle bg-chassis p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Activity size={16} className="text-primary" />
                  <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">Today's Sales</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{financialData?.todaySales || 0}</p>
                <p className="text-xs text-muted-foreground mt-2 font-mono">{formatCurrencySync(financialData?.todayRevenue || 0, baseCurrency?.symbol || 'UGX', false)}</p>
              </div>
              
              <div className="border border-border-subtle bg-chassis p-6">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp size={16} className="text-primary" />
                  <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">Avg Order Value</span>
                </div>
                <p className="text-3xl font-bold text-foreground font-mono">{formatCurrencySync(financialData?.averageOrderValue || 0, baseCurrency?.symbol || 'UGX', false)}</p>
                <p className="text-xs text-muted-foreground mt-2">{financialData?.totalSales || 0} total sales</p>
              </div>
              
              <div className="border border-border-subtle bg-chassis p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Package size={16} className="text-primary" />
                  <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">Tax Collected</span>
                </div>
                <p className="text-3xl font-bold text-foreground font-mono">{formatCurrencySync(financialData?.totalTax || 0, baseCurrency?.symbol || 'UGX', false)}</p>
                <p className="text-xs text-muted-foreground mt-2">Discounts: {formatCurrencySync(financialData?.totalDiscount || 0, baseCurrency?.symbol || 'UGX', false)}</p>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="border border-border-subtle bg-chassis p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Package size={16} className="text-primary" />
                  <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">Total Products</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{products.length}</p>
              </div>
              <div className="border border-border-subtle bg-chassis p-6">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp size={16} className="text-primary" />
                  <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">In Stock</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{products.filter((p) => p.in_stock).length}</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Monthly Sales Chart */}
              <div className="border border-border-subtle bg-chassis lg:col-span-2">
                <div className="px-6 py-4 border-b border-border-subtle">
                  <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Monthly Sales - {new Date().getFullYear()}</h2>
                  <p className="text-xs text-muted-foreground mt-1">Sales data grouped by month</p>
                </div>
                <div className="p-4 sm:p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlySales}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                      <XAxis dataKey="month" stroke={chartAxis} style={{ fontSize: '12px' }} />
                      <YAxis stroke={chartAxis} style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: chartTooltipBg, border: `1px solid ${chartTooltipBorder}` }}
                        itemStyle={{ color: chartTooltipText }}
                        labelStyle={{ color: chartTooltipText }}
                        formatter={(value: any) => formatCurrencySync(value, baseCurrency?.symbol || 'UGX', false)}
                      />
                      <Line type="monotone" dataKey="sales" stroke={chartAccent} strokeWidth={2} dot={{ fill: chartAccent }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Total Sales Summary */}
              <div className="border border-border-subtle bg-chassis">
                <div className="px-6 py-4 border-b border-border-subtle">
                  <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Total Sales</h2>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="text-center mb-6">
                    <p className="text-6xl font-bold text-primary font-mono">
                      {salesSummary ? compactNumber(salesSummary.totalSales) : '0'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 font-mono-tech uppercase tracking-widest">
                      {baseCurrency?.symbol || 'UGX'}
                    </p>
                  </div>
                  <div className="border-t border-border-subtle pt-4">
                    <p className="text-xs text-muted-foreground font-mono-tech uppercase tracking-widest mb-1">
                      Top performing month:
                    </p>
                    <p className="text-lg font-bold text-foreground">{salesSummary?.topMonth || '---'}</p>
                    <p className="text-sm text-primary font-mono mt-1">
                      {salesSummary ? formatCurrencySync(salesSummary.topMonthAmount, baseCurrency?.symbol || 'UGX', false) : '0'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Products Chart */}
            <div className="border border-border-subtle bg-chassis mb-8">
              <div className="px-6 py-4 border-b border-border-subtle">
                <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Top Products</h2>
                <p className="text-xs text-muted-foreground mt-1">Best selling products by revenue</p>
              </div>
              <div className="p-4 sm:p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProducts}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                    <XAxis dataKey="name" stroke={chartAxis} style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke={chartAxis} style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartTooltipBg, border: `1px solid ${chartTooltipBorder}` }}
                      itemStyle={{ color: chartTooltipText }}
                      labelStyle={{ color: chartTooltipText }}
                      formatter={(value: any) => formatCurrencySync(value, baseCurrency?.symbol || 'UGX', false)}
                    />
                    <Bar dataKey="total" fill={chartAccent} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </>
        )}
      </div>
    </AdminLayout>
  );
}
