import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { FileText, Search, Printer, FileSpreadsheet, FileDown, ChevronRight, ChevronDown } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import { exportToExcel, exportToPDF, printReport, CompanyInfo } from "@/utils/reportExports";
import ReportTable from "@/components/ReportTable";

type ReportCategory = "sales" | "expenses" | "inventory" | "analytics";
type ReportType = 
  | "daily-sales" | "sales-by-user" | "sales-by-customer" | "sales-by-product" | "sales-comparison"
  | "expenses-summary" | "expenses-by-category" | "cash-drawer-expenses"
  | "stock-movement" | "expiring-products" | "expired-products" | "low-stock" | "out-of-stock"
  | "trending-products" | "pos-vs-web";

type DatePreset = "today" | "yesterday" | "this-week" | "last-week" | "this-month" | "last-month" | "this-year" | "custom";

export default function ReportsNew() {
  const { baseCurrency } = useCurrency();
  const [selectedReport, setSelectedReport] = useState<ReportType>("daily-sales");
  const [expandedCategories, setExpandedCategories] = useState<Set<ReportCategory>>(new Set(["sales"]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "Your Company Name",
    address: "Company Address",
    phone: "Phone Number",
    email: "email@company.com"
  });
  
  // Date filters
  const [datePreset, setDatePreset] = useState<DatePreset>("this-month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    applyDatePreset(datePreset);
    loadCompanyInfo();
  }, [datePreset]);

  const loadCompanyInfo = async () => {
    try {
      const info = await api.company.get();
      if (info) {
        setCompanyInfo({
          name: info.name || "Your Company Name",
          address: info.address || "Company Address",
          phone: info.phone || "Phone Number",
          email: info.email || "email@company.com",
          website: info.website,
          tax_id: info.tax_id,
          logo: info.logo || ""
        });
      }
    } catch (err) {
      console.log("Company info not available, using defaults");
    }
  };

  const applyDatePreset = (preset: DatePreset) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case "today":
        start = end = today;
        break;
      case "yesterday":
        start = end = new Date(today.setDate(today.getDate() - 1));
        break;
      case "this-week":
        start = new Date(today.setDate(today.getDate() - today.getDay()));
        end = new Date();
        break;
      case "last-week":
        const lastWeekEnd = new Date(today.setDate(today.getDate() - today.getDay() - 1));
        start = new Date(lastWeekEnd);
        start.setDate(start.getDate() - 6);
        end = lastWeekEnd;
        break;
      case "this-month":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
        break;
      case "last-month":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "this-year":
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date();
        break;
      case "custom":
        return;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const toggleCategory = (category: ReportCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const generateReport = async () => {
    setLoading(true);
    setError("");
    setReportData(null);

    try {
      let data;
      
      switch (selectedReport) {
        // Sales Reports
        case "daily-sales":
          data = await api.reports.sales.daily(startDate, endDate);
          break;
        case "sales-by-user":
          data = await api.reports.sales.byUser(startDate, endDate);
          break;
        case "sales-by-customer":
          data = await api.reports.sales.byCustomer(startDate, endDate);
          break;
        case "sales-by-product":
          data = await api.reports.sales.byProduct(startDate, endDate);
          break;
        case "sales-comparison":
          data = await api.reports.sales.comparison(startDate, endDate);
          break;
        
        // Expenses Reports
        case "expenses-summary":
          data = await api.reports.expenses.summary(startDate, endDate);
          break;
        case "expenses-by-category":
          data = await api.reports.expenses.byCategory(startDate, endDate);
          break;
        case "cash-drawer-expenses":
          data = await api.reports.expenses.cashDrawer(startDate, endDate);
          break;
        
        // Inventory Reports
        case "stock-movement":
          data = await api.reports.inventory.stockMovement(startDate, endDate);
          break;
        case "expiring-products":
          data = await api.reports.inventory.expiring();
          break;
        case "expired-products":
          data = await api.reports.inventory.expired();
          break;
        case "low-stock":
          data = await api.reports.inventory.lowStock();
          break;
        case "out-of-stock":
          data = await api.reports.inventory.outOfStock();
          break;
        
        // Analytics Reports
        case "trending-products":
          data = await api.reports.trending.products(startDate, endDate, 20);
          break;
        case "pos-vs-web":
          data = await api.reports.trending.posVsWeb(startDate, endDate);
          break;
      }

      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const getReportColumns = () => {
    const columnMaps: Record<ReportType, { header: string; dataKey: string }[]> = {
      "daily-sales": [
        { header: "Date", dataKey: "date" },
        { header: "Sales Count", dataKey: "total_sales" },
        { header: "Revenue", dataKey: "total_revenue" },
        { header: "Tax", dataKey: "total_tax" },
        { header: "Discounts", dataKey: "total_discounts" },
        { header: "Avg Sale", dataKey: "average_sale" }
      ],
      "sales-by-user": [
        { header: "User", dataKey: "user_email" },
        { header: "Sales Count", dataKey: "total_sales" },
        { header: "Revenue", dataKey: "total_revenue" },
        { header: "Tax", dataKey: "total_tax" },
        { header: "Avg Sale", dataKey: "average_sale" }
      ],
      "sales-by-customer": [
        { header: "Customer", dataKey: "customer_name" },
        { header: "Purchases", dataKey: "total_purchases" },
        { header: "Total Spent", dataKey: "total_spent" },
        { header: "Avg Purchase", dataKey: "average_purchase" },
        { header: "Last Purchase", dataKey: "last_purchase" }
      ],
      "sales-by-product": [
        { header: "Product", dataKey: "product_name" },
        { header: "Quantity Sold", dataKey: "total_quantity" },
        { header: "Revenue", dataKey: "total_revenue" },
        { header: "Times Sold", dataKey: "times_sold" },
        { header: "Avg Price", dataKey: "average_price" }
      ],
      "sales-comparison": [
        { header: "Channel", dataKey: "channel" },
        { header: "Orders", dataKey: "orders" },
        { header: "Revenue", dataKey: "revenue" },
        { header: "Avg Order", dataKey: "avg_order" }
      ],
      "expenses-summary": [
        { header: "Category", dataKey: "category" },
        { header: "Amount", dataKey: "amount" }
      ],
      "expenses-by-category": [
        { header: "Code", dataKey: "code" },
        { header: "Category", dataKey: "category_name" },
        { header: "Transactions", dataKey: "transaction_count" },
        { header: "Total Amount", dataKey: "total_amount" }
      ],
      "cash-drawer-expenses": [
        { header: "Date", dataKey: "created_at" },
        { header: "User", dataKey: "user_email" },
        { header: "Reason", dataKey: "reason" },
        { header: "Amount", dataKey: "amount" }
      ],
      "stock-movement": [
        { header: "Date", dataKey: "created_at" },
        { header: "Product", dataKey: "product_name" },
        { header: "Type", dataKey: "movement_type" },
        { header: "Quantity", dataKey: "quantity" },
        { header: "User", dataKey: "user_email" }
      ],
      "expiring-products": [
        { header: "Product", dataKey: "name" },
        { header: "Barcode", dataKey: "barcode" },
        { header: "Quantity", dataKey: "quantity_on_hand" },
        { header: "Expiry Date", dataKey: "expiry_date" },
        { header: "Days Until Expiry", dataKey: "days_until_expiry" }
      ],
      "expired-products": [
        { header: "Product", dataKey: "name" },
        { header: "Barcode", dataKey: "barcode" },
        { header: "Quantity", dataKey: "quantity_on_hand" },
        { header: "Expiry Date", dataKey: "expiry_date" },
        { header: "Days Expired", dataKey: "days_expired" }
      ],
      "low-stock": [
        { header: "Product", dataKey: "name" },
        { header: "Barcode", dataKey: "barcode" },
        { header: "Current Stock", dataKey: "quantity_on_hand" },
        { header: "Reorder Level", dataKey: "reorder_level" },
        { header: "Below By", dataKey: "units_below_reorder" }
      ],
      "out-of-stock": [
        { header: "Product", dataKey: "name" },
        { header: "Barcode", dataKey: "barcode" },
        { header: "Reorder Level", dataKey: "reorder_level" },
        { header: "Last Updated", dataKey: "updated_at" }
      ],
      "trending-products": [
        { header: "Product", dataKey: "product_name" },
        { header: "Total Qty", dataKey: "total_quantity" },
        { header: "Total Revenue", dataKey: "total_revenue" },
        { header: "POS Qty", dataKey: "pos_quantity" },
        { header: "POS Revenue", dataKey: "pos_revenue" },
        { header: "Web Qty", dataKey: "web_quantity" },
        { header: "Web Revenue", dataKey: "web_revenue" }
      ],
      "pos-vs-web": [
        { header: "Date", dataKey: "date" },
        { header: "POS Orders", dataKey: "pos_orders" },
        { header: "POS Revenue", dataKey: "pos_revenue" },
        { header: "Web Orders", dataKey: "web_orders" },
        { header: "Web Revenue", dataKey: "web_revenue" }
      ]
    };

    return columnMaps[selectedReport] || [];
  };

  const prepareExportData = () => {
    if (!reportData) return [];
    
    // Handle special case for sales comparison
    if (selectedReport === "sales-comparison" && !Array.isArray(reportData)) {
      return [
        { channel: "POS", orders: reportData.pos.total_orders, revenue: reportData.pos.total_revenue, avg_order: reportData.pos.average_order_value },
        { channel: "Website", orders: reportData.website.total_orders, revenue: reportData.website.total_revenue, avg_order: reportData.website.average_order_value },
        { channel: "Total", orders: reportData.total_orders, revenue: reportData.total_revenue, avg_order: Math.round(reportData.total_revenue / reportData.total_orders) }
      ];
    }

    // Handle expenses summary
    if (selectedReport === "expenses-summary" && !Array.isArray(reportData)) {
      return [
        { category: "Accounting Expenses", amount: reportData.accounting_expenses },
        { category: "Cash Drawer Expenses", amount: reportData.cash_drawer_expenses },
        { category: "Total Expenses", amount: reportData.total_expenses }
      ];
    }

    return Array.isArray(reportData) ? reportData : [];
  };

  const handlePrint = () => {
    if (!reportData) {
      alert("Please generate a report first");
      return;
    }

    printReport({
      reportTitle: getReportTitle(),
      dateRange: `${startDate} to ${endDate}`,
      companyInfo,
      data: prepareExportData(),
      columns: getReportColumns(),
      currency: baseCurrency?.symbol || 'UGX'
    });
  };

  const handleExportExcel = () => {
    if (!reportData) {
      alert("Please generate a report first");
      return;
    }

    exportToExcel({
      reportTitle: getReportTitle(),
      dateRange: `${startDate} to ${endDate}`,
      companyInfo,
      data: prepareExportData(),
      columns: getReportColumns()
    });
  };

  const handleExportPDF = () => {
    if (!reportData) {
      alert("Please generate a report first");
      return;
    }

    exportToPDF({
      reportTitle: getReportTitle(),
      dateRange: `${startDate} to ${endDate}`,
      companyInfo,
      data: prepareExportData(),
      columns: getReportColumns(),
      currency: baseCurrency?.symbol || 'UGX'
    });
  };

  const reportCategories = [
    {
      id: "sales" as ReportCategory,
      name: "Sales",
      reports: [
        { id: "daily-sales", name: "Daily sales" },
        { id: "sales-by-user", name: "Sales by users" },
        { id: "sales-by-customer", name: "Sales by customers" },
        { id: "sales-by-product", name: "Sales by products" },
        { id: "sales-comparison", name: "POS vs Website" },
      ]
    },
    {
      id: "expenses" as ReportCategory,
      name: "Expenses",
      reports: [
        { id: "expenses-summary", name: "Expenses summary" },
        { id: "expenses-by-category", name: "Expenses by category" },
        { id: "cash-drawer-expenses", name: "Cash drawer expenses" },
      ]
    },
    {
      id: "inventory" as ReportCategory,
      name: "Inventory",
      reports: [
        { id: "stock-movement", name: "Stock movement" },
        { id: "expiring-products", name: "Expiring soon" },
        { id: "expired-products", name: "Expired products" },
        { id: "low-stock", name: "Low stock" },
        { id: "out-of-stock", name: "Out of stock" },
      ]
    },
    {
      id: "analytics" as ReportCategory,
      name: "Analytics",
      reports: [
        { id: "trending-products", name: "Trending products" },
        { id: "pos-vs-web", name: "POS vs Website comparison" },
      ]
    }
  ];

  const getReportTitle = () => {
    for (const category of reportCategories) {
      const report = category.reports.find(r => r.id === selectedReport);
      if (report) return report.name;
    }
    return "Report";
  };

  return (
    <AdminLayout>
      <div className="flex h-screen overflow-hidden">
        {/* Left Sidebar - Report Selection */}
        <div className="w-80 bg-admin-surface border-r border-admin-border overflow-y-auto">
          <div className="p-4 border-b border-admin-border">
            <h2 className="text-lg font-bold text-admin-text mb-3">Select report to view or print</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-admin-text-secondary" size={16} />
              <input
                type="text"
                placeholder="Search reports"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
              />
            </div>
          </div>

          <div className="p-2">
            {reportCategories.map(category => {
              const isExpanded = expandedCategories.has(category.id);
              const filteredReports = category.reports.filter(r => 
                r.name.toLowerCase().includes(searchQuery.toLowerCase())
              );
              
              if (searchQuery && filteredReports.length === 0) return null;

              return (
                <div key={category.id} className="mb-1">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-admin-text hover:bg-admin-bg"
                  >
                    <span>{category.name}</span>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  
                  {isExpanded && (
                    <div className="ml-2">
                      {filteredReports.map(report => (
                        <button
                          key={report.id}
                          onClick={() => setSelectedReport(report.id as ReportType)}
                          className={`w-full text-left px-3 py-2 text-sm ${
                            selectedReport === report.id
                              ? "bg-admin-text text-admin-bg"
                              : "text-admin-text-secondary hover:bg-admin-bg hover:text-admin-text"
                          }`}
                        >
                          {report.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Filter Bar */}
          <div className="bg-admin-surface border-b border-admin-border p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <label className="block text-xs text-admin-text-secondary mb-1">Date Range</label>
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this-week">This Week</option>
                  <option value="last-week">Last Week</option>
                  <option value="this-month">This Month</option>
                  <option value="last-month">Last Month</option>
                  <option value="this-year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {datePreset === "custom" && (
                <>
                  <div className="flex-1">
                    <label className="block text-xs text-admin-text-secondary mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-admin-text-secondary mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={generateReport}
                disabled={loading}
                className="px-4 py-2 bg-admin-text text-admin-bg hover:opacity-90 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              >
                <FileText size={16} />
                {loading ? "Generating..." : "Show report"}
              </button>
              <button
                onClick={handlePrint}
                disabled={!reportData}
                className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface disabled:opacity-50 text-sm flex items-center gap-2"
              >
                <Printer size={16} />
                Print
              </button>
              <button
                onClick={handleExportExcel}
                disabled={!reportData}
                className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface disabled:opacity-50 text-sm flex items-center gap-2"
              >
                <FileSpreadsheet size={16} />
                Excel
              </button>
              <button
                onClick={handleExportPDF}
                disabled={!reportData}
                className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface disabled:opacity-50 text-sm flex items-center gap-2"
              >
                <FileDown size={16} />
                PDF
              </button>
            </div>
          </div>

          {/* Report Display Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-admin-bg">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 mb-4">
                {error}
              </div>
            )}

            {!reportData && !loading && (
              <div className="text-center text-admin-text-secondary py-12">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a report and click "Show report" to view data</p>
              </div>
            )}

            {loading && (
              <div className="text-center text-admin-text-secondary py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-text mx-auto mb-4"></div>
                <p>Generating report...</p>
              </div>
            )}

            {reportData && !loading && (
              <div className="bg-white border border-gray-300 shadow-lg" style={{ minHeight: '800px' }}>
                {/* Professional Document Header */}
                <div className="border-b-2 border-gray-800 p-8 bg-white">
                  <div className="flex items-start gap-6">
                    {/* Logo on the left */}
                    <div className="flex-shrink-0">
                      {companyInfo.logo ? (
                        <img 
                          src={companyInfo.logo} 
                          alt={companyInfo.name} 
                          className="w-32 h-32 object-contain"
                        />
                      ) : (
                        <div className="w-32 h-32 bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No Logo</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Company info on the right */}
                    <div className="flex-1 text-right">
                      <h1 className="text-3xl font-bold text-gray-900 mb-3">{companyInfo.name}</h1>
                      <p className="text-sm text-gray-600 mb-1">{companyInfo.address}</p>
                      <p className="text-sm text-gray-600 mb-1">
                        Phone: {companyInfo.phone} | Email: {companyInfo.email}
                      </p>
                      {companyInfo.website && (
                        <p className="text-sm text-gray-600 mb-1">Website: {companyInfo.website}</p>
                      )}
                      {companyInfo.tax_id && (
                        <p className="text-sm text-gray-600">Tax ID: {companyInfo.tax_id}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Report Title Section */}
                <div className="p-6 bg-white">
                  <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">{getReportTitle()}</h2>
                  <p className="text-sm text-gray-600 text-center mb-6">
                    {startDate} to {endDate}
                  </p>
                
                <div className="bg-white p-6">

                {/* Daily Sales Report */}
                {selectedReport === "daily-sales" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'Date', accessor: 'date', format: (val) => new Date(val).toLocaleDateString() },
                      { header: 'Sales Count', accessor: 'total_sales', align: 'right' },
                      { header: 'Revenue', accessor: 'total_revenue', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Tax', accessor: 'total_tax', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Discounts', accessor: 'total_discounts', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Avg Sale', accessor: 'average_sale', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) }
                    ]}
                    data={reportData}
                    totalsExclude={['date', 'average_sale']}
                  />
                )}

                {/* Sales by User Report */}
                {selectedReport === "sales-by-user" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'User', accessor: 'user_email' },
                      { header: 'Sales Count', accessor: 'total_sales', align: 'right' },
                      { header: 'Total Revenue', accessor: 'total_revenue', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Tax Collected', accessor: 'total_tax', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Avg Sale', accessor: 'average_sale', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) }
                    ]}
                    data={reportData}
                    totalsExclude={['user_email', 'average_sale']}
                  />
                )}

                {/* Sales by Customer Report */}
                {selectedReport === "sales-by-customer" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'Customer', accessor: 'customer_name' },
                      { header: 'Purchases', accessor: 'total_purchases', align: 'right' },
                      { header: 'Total Spent', accessor: 'total_spent', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Avg Purchase', accessor: 'average_purchase', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Last Purchase', accessor: 'last_purchase', align: 'right', format: (val) => new Date(val).toLocaleDateString() }
                    ]}
                    data={reportData}
                    totalsExclude={['customer_name', 'average_purchase', 'last_purchase']}
                  />
                )}

                {/* Sales by Product Report */}
                {selectedReport === "sales-by-product" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'Product', accessor: 'product_name' },
                      { header: 'Quantity Sold', accessor: 'total_quantity', align: 'right' },
                      { header: 'Revenue', accessor: 'total_revenue', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Times Sold', accessor: 'times_sold', align: 'right' },
                      { header: 'Avg Price', accessor: 'average_price', align: 'right', format: (val) => formatCurrencySync(Math.round(parseFloat(val)), baseCurrency?.symbol || 'UGX', false) }
                    ]}
                    data={reportData}
                    totalsExclude={['product_name', 'average_price']}
                  />
                )}

                {/* Sales Comparison Report */}
                {selectedReport === "sales-comparison" && reportData && !Array.isArray(reportData) && (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="border border-admin-border p-4">
                      <h3 className="text-lg font-bold text-admin-text mb-4">POS Sales</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-admin-text-secondary">Total Orders:</span>
                          <span className="font-bold text-admin-text">{reportData.pos.total_orders}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-admin-text-secondary">Total Revenue:</span>
                          <span className="font-mono font-bold text-admin-text">
                            {formatCurrencySync(parseInt(reportData.pos.total_revenue), baseCurrency?.symbol || 'UGX', false)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-admin-text-secondary">Avg Order Value:</span>
                          <span className="font-mono text-admin-text">
                            {formatCurrencySync(parseInt(reportData.pos.average_order_value), baseCurrency?.symbol || 'UGX', false)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-admin-border p-4">
                      <h3 className="text-lg font-bold text-admin-text mb-4">Website Orders</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-admin-text-secondary">Total Orders:</span>
                          <span className="font-bold text-admin-text">{reportData.website.total_orders}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-admin-text-secondary">Total Revenue:</span>
                          <span className="font-mono font-bold text-admin-text">
                            {formatCurrencySync(parseInt(reportData.website.total_revenue), baseCurrency?.symbol || 'UGX', false)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-admin-text-secondary">Avg Order Value:</span>
                          <span className="font-mono text-admin-text">
                            {formatCurrencySync(parseInt(reportData.website.average_order_value), baseCurrency?.symbol || 'UGX', false)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2 border border-admin-text bg-admin-text/5 p-4">
                      <h3 className="text-lg font-bold text-admin-text mb-4">Combined Totals</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex justify-between">
                          <span className="text-admin-text-secondary">Total Orders:</span>
                          <span className="font-bold text-admin-text">{reportData.total_orders}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-admin-text-secondary">Total Revenue:</span>
                          <span className="font-mono font-bold text-admin-text">
                            {formatCurrencySync(parseInt(reportData.total_revenue), baseCurrency?.symbol || 'UGX', false)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expenses Summary */}
                {selectedReport === "expenses-summary" && reportData && !Array.isArray(reportData) && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="border border-admin-border p-4">
                        <p className="text-xs text-admin-text-secondary mb-2">Accounting Expenses</p>
                        <p className="text-2xl font-bold font-mono text-admin-text">
                          {formatCurrencySync(parseInt(reportData.accounting_expenses), baseCurrency?.symbol || 'UGX', false)}
                        </p>
                      </div>
                      <div className="border border-admin-border p-4">
                        <p className="text-xs text-admin-text-secondary mb-2">Cash Drawer Expenses</p>
                        <p className="text-2xl font-bold font-mono text-admin-text">
                          {formatCurrencySync(parseInt(reportData.cash_drawer_expenses), baseCurrency?.symbol || 'UGX', false)}
                        </p>
                      </div>
                      <div className="border border-admin-text bg-admin-text/5 p-4">
                        <p className="text-xs text-admin-text-secondary mb-2">Total Expenses</p>
                        <p className="text-2xl font-bold font-mono text-admin-text">
                          {formatCurrencySync(parseInt(reportData.total_expenses), baseCurrency?.symbol || 'UGX', false)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expenses by Category */}
                {selectedReport === "expenses-by-category" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'Account Code', accessor: 'code' },
                      { header: 'Category', accessor: 'category_name' },
                      { header: 'Transactions', accessor: 'transaction_count', align: 'right' },
                      { header: 'Total Amount', accessor: 'total_amount', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) }
                    ]}
                    data={reportData}
                    totalsExclude={['code', 'category_name']}
                  />
                )}

                {/* Cash Drawer Expenses */}
                {selectedReport === "cash-drawer-expenses" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'Date', accessor: 'created_at', format: (val) => new Date(val).toLocaleString() },
                      { header: 'User', accessor: 'user_email' },
                      { header: 'Reason', accessor: 'reason' },
                      { header: 'Amount', accessor: 'amount', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) }
                    ]}
                    data={reportData}
                    totalsExclude={['created_at', 'user_email', 'reason']}
                  />
                )}

                {/* Stock Movement */}
                {selectedReport === "stock-movement" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'Date', accessor: 'created_at', format: (val) => new Date(val).toLocaleString() },
                      { header: 'Product', accessor: 'product_name' },
                      { header: 'Type', accessor: 'movement_type' },
                      { header: 'Quantity', accessor: 'quantity', align: 'right' },
                      { header: 'User', accessor: 'user_email' },
                      { header: 'Notes', accessor: 'notes' }
                    ]}
                    data={reportData}
                    totalsExclude={['created_at', 'product_name', 'movement_type', 'user_email', 'notes']}
                  />
                )}

                {/* Expiring Products */}
                {selectedReport === "expiring-products" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'Product', accessor: 'name' },
                      { header: 'Barcode', accessor: 'barcode' },
                      { header: 'Quantity', accessor: 'quantity_on_hand', align: 'right' },
                      { header: 'Expiry Date', accessor: 'expiry_date', format: (val) => new Date(val).toLocaleDateString() },
                      { header: 'Days Until Expiry', accessor: 'days_until_expiry', align: 'right', format: (val) => `${val} days` }
                    ]}
                    data={reportData}
                    showTotals={false}
                  />
                )}

                {/* Expired Products */}
                {selectedReport === "expired-products" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'Product', accessor: 'name' },
                      { header: 'Barcode', accessor: 'barcode' },
                      { header: 'Quantity', accessor: 'quantity_on_hand', align: 'right' },
                      { header: 'Expiry Date', accessor: 'expiry_date', format: (val) => new Date(val).toLocaleDateString() },
                      { header: 'Days Expired', accessor: 'days_expired', align: 'right', format: (val) => `${val} days ago` }
                    ]}
                    data={reportData}
                    showTotals={false}
                  />
                )}

                {/* Low Stock */}
                {selectedReport === "low-stock" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'Product', accessor: 'name' },
                      { header: 'Barcode', accessor: 'barcode' },
                      { header: 'Current Stock', accessor: 'quantity_on_hand', align: 'right' },
                      { header: 'Reorder Level', accessor: 'reorder_level', align: 'right' },
                      { header: 'Below By', accessor: 'units_below_reorder', align: 'right', format: (val) => `${val} units` }
                    ]}
                    data={reportData}
                    showTotals={false}
                  />
                )}

                {/* Out of Stock */}
                {selectedReport === "out-of-stock" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'Product', accessor: 'name' },
                      { header: 'Barcode', accessor: 'barcode' },
                      { header: 'Reorder Level', accessor: 'reorder_level', align: 'right' },
                      { header: 'Last Updated', accessor: 'updated_at', format: (val) => new Date(val).toLocaleString() }
                    ]}
                    data={reportData}
                    showTotals={false}
                  />
                )}

                {/* Trending Products */}
                {selectedReport === "trending-products" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'Product', accessor: 'product_name' },
                      { header: 'Total Qty', accessor: 'total_quantity', align: 'right' },
                      { header: 'Total Revenue', accessor: 'total_revenue', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'POS Qty', accessor: 'pos_quantity', align: 'right' },
                      { header: 'POS Revenue', accessor: 'pos_revenue', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Web Qty', accessor: 'web_quantity', align: 'right' },
                      { header: 'Web Revenue', accessor: 'web_revenue', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) }
                    ]}
                    data={reportData}
                    totalsExclude={['product_name']}
                  />
                )}

                {/* POS vs Web Comparison */}
                {selectedReport === "pos-vs-web" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'Date', accessor: 'date', format: (val) => new Date(val).toLocaleDateString() },
                      { header: 'POS Orders', accessor: 'pos_orders', align: 'right' },
                      { header: 'POS Revenue', accessor: 'pos_revenue', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Web Orders', accessor: 'web_orders', align: 'right' },
                      { header: 'Web Revenue', accessor: 'web_revenue', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Total Revenue', accessor: 'total_revenue', align: 'right', format: (val) => formatCurrencySync(parseInt(val), baseCurrency?.symbol || 'UGX', false) }
                    ]}
                    data={reportData.map((row: any) => ({ ...row, total_revenue: parseInt(row.pos_revenue) + parseInt(row.web_revenue) }))}
                    totalsExclude={['date']}
                  />
                )}

                {reportData && Array.isArray(reportData) && reportData.length === 0 && (
                  <div className="text-center text-gray-600 py-8">
                    <p>No data found for the selected date range</p>
                  </div>
                )}

                </div>
                </div>

                {/* Document Footer */}
                <div className="border-t border-gray-300 p-6 bg-gray-50 text-center text-xs text-gray-600">
                  <p>Generated on {new Date().toLocaleString()}</p>
                  <p className="mt-1">This is a computer-generated document. No signature is required.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
