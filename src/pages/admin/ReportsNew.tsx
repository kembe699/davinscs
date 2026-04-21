import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { FileText, Search, Printer, FileSpreadsheet, FileDown, ChevronRight, ChevronDown } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import { exportToExcel, exportToPDF, printReport, CompanyInfo } from "@/utils/reportExports";
import ReportTable from "@/components/ReportTable";
import { useToast } from "@/contexts/ToastContext";

type ReportCategory = "sales" | "expenses" | "inventory" | "analytics" | "invoices";
type ReportType = 
  | "daily-sales" | "sales-by-user" | "sales-by-customer" | "sales-by-product" | "sales-comparison" | "sales-by-scheme"
  | "income-statement" | "expenses-summary" | "expenses-by-category" | "cash-drawer-expenses"
  | "stock-movement" | "expiring-products" | "expired-products" | "low-stock" | "out-of-stock"
  | "trending-products" | "pos-vs-web"
  | "invoices-overview" | "invoices-all" | "invoices-overdue" | "invoices-partial" | "invoices-collections";

type DatePreset = "today" | "yesterday" | "this-week" | "last-week" | "this-month" | "last-month" | "this-year" | "custom";

export default function ReportsNew() {
  const { toast } = useToast();
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

  // Scheme filter (only used for sales-by-scheme)
  const [filterSchemeId, setFilterSchemeId] = useState<number | null>(null);
  const [schemesList, setSchemesList] = useState<any[]>([]);

  useEffect(() => {
    applyDatePreset(datePreset);
    loadCompanyInfo();
    api.priceLists.active().then(setSchemesList).catch(() => {});
  }, [datePreset]);

  // Auto-generate whenever the selected report or date range changes
  useEffect(() => {
    if (startDate && endDate) {
      generateReport();
    }
  }, [selectedReport, startDate, endDate]);

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
        case "sales-by-scheme":
          data = await api.reports.sales.byScheme(startDate, endDate, filterSchemeId);
          break;
        
        // Expenses / P&L Reports
        case "income-statement":
          data = await api.reports.incomeStatement(startDate, endDate);
          break;
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

        // Invoice Reports
        case "invoices-overview":
          data = await api.reports.invoiceReports.overview(startDate, endDate);
          break;
        case "invoices-all":
          data = await api.reports.invoiceReports.all(startDate, endDate);
          break;
        case "invoices-overdue":
          data = await api.reports.invoiceReports.overdue();
          break;
        case "invoices-partial":
          data = await api.reports.invoiceReports.partial(startDate, endDate);
          break;
        case "invoices-collections":
          data = await api.reports.invoiceReports.collections(startDate, endDate);
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
      "income-statement": [
        { header: "Line Item", dataKey: "label" },
        { header: "Amount", dataKey: "amount" }
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
      ],
      "sales-by-scheme": [
        { header: "Scheme", dataKey: "scheme_name" },
        { header: "Currency", dataKey: "currency_code" },
        { header: "Sales Count", dataKey: "total_sales" },
        { header: "Revenue", dataKey: "total_revenue" },
        { header: "Tax", dataKey: "total_tax" },
        { header: "Discounts", dataKey: "total_discounts" },
        { header: "Avg Sale", dataKey: "average_sale" }
      ],
      "invoices-overview": [
        { header: "Status", dataKey: "status" },
        { header: "Count", dataKey: "invoice_count" },
        { header: "Total Billed", dataKey: "total_billed" },
        { header: "Total Paid", dataKey: "total_paid" },
        { header: "Outstanding", dataKey: "total_outstanding" }
      ],
      "invoices-all": [
        { header: "Invoice #", dataKey: "invoice_number" },
        { header: "Customer", dataKey: "customer_name" },
        { header: "Phone", dataKey: "customer_phone" },
        { header: "Date", dataKey: "date" },
        { header: "Due Date", dataKey: "due_date" },
        { header: "Total", dataKey: "total_amount" },
        { header: "Paid", dataKey: "paid_amount" },
        { header: "Balance", dataKey: "balance_due" },
        { header: "Status", dataKey: "status" }
      ],
      "invoices-overdue": [
        { header: "Invoice #", dataKey: "invoice_number" },
        { header: "Customer", dataKey: "customer_name" },
        { header: "Phone", dataKey: "customer_phone" },
        { header: "Due Date", dataKey: "due_date" },
        { header: "Days Overdue", dataKey: "days_overdue" },
        { header: "Total", dataKey: "total_amount" },
        { header: "Balance", dataKey: "balance_due" },
        { header: "Status", dataKey: "status" }
      ],
      "invoices-partial": [
        { header: "Invoice #", dataKey: "invoice_number" },
        { header: "Customer", dataKey: "customer_name" },
        { header: "Date", dataKey: "date" },
        { header: "Total", dataKey: "total_amount" },
        { header: "Paid", dataKey: "paid_amount" },
        { header: "Balance", dataKey: "balance_due" },
        { header: "% Paid", dataKey: "payment_pct" }
      ],
      "invoices-collections": [
        { header: "Date", dataKey: "payment_date" },
        { header: "Invoice #", dataKey: "invoice_number" },
        { header: "Customer", dataKey: "customer_name" },
        { header: "Method", dataKey: "payment_method" },
        { header: "Amount", dataKey: "amount" },
        { header: "Notes", dataKey: "notes" }
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

    // Handle income statement
    if (selectedReport === "income-statement" && reportData && !Array.isArray(reportData)) {
      const rows: any[] = [];
      rows.push({ label: '── REVENUE ──', amount: '' });
      (reportData.revenue || []).forEach((r: any) => rows.push({ label: r.label, amount: r.amount }));
      rows.push({ label: 'Total Revenue', amount: reportData.total_revenue });
      rows.push({ label: '', amount: '' });
      rows.push({ label: '── EXPENSES ──', amount: '' });
      (reportData.expenses || []).forEach((e: any) => rows.push({ label: e.label, amount: e.amount }));
      rows.push({ label: 'Total Expenses', amount: reportData.total_expenses });
      rows.push({ label: '', amount: '' });
      rows.push({ label: 'NET INCOME', amount: reportData.net_income });
      return rows;
    }

    // Handle expenses summary
    if (selectedReport === "expenses-summary" && !Array.isArray(reportData)) {
      return [
        { category: "Procurement Payments", amount: reportData.procurement_payments },
        { category: "Accounting Expenses", amount: reportData.accounting_expenses },
        { category: "Cash Drawer Expenses", amount: reportData.cash_drawer_expenses },
        { category: "Total Expenses", amount: reportData.total_expenses }
      ];
    }

    // Pre-format sales-by-scheme so print/PDF/Excel show clean values
    if (selectedReport === "sales-by-scheme" && Array.isArray(reportData)) {
      return reportData.map((row: any) => {
        const sym = row.currency_symbol || baseCurrency?.symbol || 'UGX';
        const fmt = (v: any) => `${sym} ${Math.round(parseFloat(v)).toLocaleString('en-US')}`;
        return {
          scheme_name: row.scheme_name,
          currency_code: row.currency_code || baseCurrency?.code || 'UGX',
          total_sales: row.total_sales,
          total_revenue: fmt(row.total_revenue),
          total_tax: fmt(row.total_tax),
          total_discounts: fmt(row.total_discounts),
          average_sale: fmt(row.average_sale),
        };
      });
    }

    return Array.isArray(reportData) ? reportData : [];
  };

  const handlePrint = () => {
    if (!reportData) {
      toast("Please generate a report first", "warning", "No Report");
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
      toast("Please generate a report first", "warning", "No Report");
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
      toast("Please generate a report first", "warning", "No Report");
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
        { id: "sales-by-scheme", name: "Sales by scheme" },
      ]
    },
    {
      id: "expenses" as ReportCategory,
      name: "Expenses",
      reports: [
        { id: "income-statement",    name: "Income Statement (P&L)" },
        { id: "expenses-summary",    name: "Expenses summary" },
        { id: "expenses-by-category",name: "Expenses by category" },
        { id: "cash-drawer-expenses",name: "Cash drawer expenses" },
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
    },
    {
      id: "invoices" as ReportCategory,
      name: "Invoices",
      reports: [
        { id: "invoices-overview",     name: "Invoices overview" },
        { id: "invoices-all",          name: "All invoices" },
        { id: "invoices-overdue",      name: "Overdue invoices" },
        { id: "invoices-partial",      name: "Partially paid" },
        { id: "invoices-collections",  name: "Payment collections" },
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

            <div className="flex items-center gap-2 flex-wrap">
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

              {selectedReport === "sales-by-scheme" && (
                <select
                  value={filterSchemeId ?? ""}
                  onChange={e => setFilterSchemeId(e.target.value === "" ? null : Number(e.target.value))}
                  className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                >
                  <option value="">All Schemes</option>
                  <option value="0">Cash (Standard)</option>
                  {schemesList.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.currency_code ? ` (${s.currency_code})` : ""}
                    </option>
                  ))}
                </select>
              )}
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
              <div className="bg-white border border-gray-300 shadow-lg text-gray-900" style={{ minHeight: '800px' }}>
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

                {/* Income Statement (P&L) */}
                {selectedReport === "income-statement" && reportData && !Array.isArray(reportData) && (
                  <div className="max-w-2xl mx-auto">
                    {/* Revenue */}
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b-2 border-gray-800 pb-1 mb-3">Revenue</h3>
                      {(reportData.revenue || []).map((r: any, i: number) => (
                        <div key={i} className="flex justify-between py-1.5 text-sm border-b border-gray-100">
                          <span className="text-gray-700">{r.label}</span>
                          <span className="font-mono font-medium text-gray-900">{formatCurrencySync(r.amount, baseCurrency?.symbol || 'UGX', false)}</span>
                        </div>
                      ))}
                      {(reportData.revenue || []).length === 0 && (
                        <p className="text-sm text-gray-400 italic py-2">No revenue recorded in this period</p>
                      )}
                      <div className="flex justify-between py-2 border-t-2 border-gray-800 mt-1 font-bold">
                        <span className="text-gray-900">Total Revenue</span>
                        <span className="font-mono text-green-700">{formatCurrencySync(reportData.total_revenue, baseCurrency?.symbol || 'UGX', false)}</span>
                      </div>
                    </div>

                    {/* Cost of Goods Sold */}
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b-2 border-orange-600 pb-1 mb-3">Cost of Goods Sold</h3>
                      <div className="flex justify-between py-1.5 text-sm border-b border-gray-100">
                        <span className="text-gray-700">Cost of Goods Sold (COGS)</span>
                        <span className="font-mono font-medium text-orange-700">{formatCurrencySync(reportData.cogs || 0, baseCurrency?.symbol || 'UGX', false)}</span>
                      </div>
                      <div className={`flex justify-between py-2 border-t-2 mt-1 font-bold ${(reportData.gross_profit ?? reportData.total_revenue) >= 0 ? 'border-green-700 text-green-800' : 'border-red-600 text-red-700'}`}>
                        <span>Gross Profit</span>
                        <span className="font-mono">{formatCurrencySync(reportData.gross_profit ?? reportData.total_revenue, baseCurrency?.symbol || 'UGX', false)}</span>
                      </div>
                    </div>

                    {/* Operating Expenses */}
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b-2 border-gray-800 pb-1 mb-3">Operating Expenses</h3>
                      {(reportData.expenses || []).map((e: any, i: number) => (
                        <div key={i} className="flex justify-between py-1.5 text-sm border-b border-gray-100">
                          <span className="text-gray-700">{e.label}</span>
                          <span className="font-mono font-medium text-gray-900">{formatCurrencySync(e.amount, baseCurrency?.symbol || 'UGX', false)}</span>
                        </div>
                      ))}
                      {(reportData.expenses || []).length === 0 && (
                        <p className="text-sm text-gray-400 italic py-2">No operating expenses in this period</p>
                      )}
                      <div className="flex justify-between py-2 border-t-2 border-gray-800 mt-1 font-bold">
                        <span className="text-gray-900">Total Operating Expenses</span>
                        <span className="font-mono text-red-600">{formatCurrencySync(reportData.total_expenses, baseCurrency?.symbol || 'UGX', false)}</span>
                      </div>
                    </div>

                    {/* Net Income */}
                    <div className={`flex justify-between py-4 px-4 border-2 text-lg font-bold ${
                      reportData.net_income >= 0 ? 'border-green-600 bg-green-50 text-green-800' : 'border-red-500 bg-red-50 text-red-800'
                    }`}>
                      <span>{reportData.net_income >= 0 ? 'Net Income (Profit)' : 'Net Loss'}</span>
                      <span className="font-mono">{formatCurrencySync(Math.abs(reportData.net_income), baseCurrency?.symbol || 'UGX', false)}</span>
                    </div>
                  </div>
                )}

                {/* Expenses Summary */}
                {selectedReport === "expenses-summary" && reportData && !Array.isArray(reportData) && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="border border-admin-border p-4">
                        <p className="text-xs text-admin-text-secondary mb-2">Procurement Payments</p>
                        <p className="text-xl font-bold font-mono text-admin-text">
                          {formatCurrencySync(parseInt(reportData.procurement_payments) || 0, baseCurrency?.symbol || 'UGX', false)}
                        </p>
                      </div>
                      <div className="border border-admin-border p-4">
                        <p className="text-xs text-admin-text-secondary mb-2">Accounting Expenses</p>
                        <p className="text-xl font-bold font-mono text-admin-text">
                          {formatCurrencySync(parseInt(reportData.accounting_expenses) || 0, baseCurrency?.symbol || 'UGX', false)}
                        </p>
                      </div>
                      <div className="border border-admin-border p-4">
                        <p className="text-xs text-admin-text-secondary mb-2">Cash Drawer Expenses</p>
                        <p className="text-xl font-bold font-mono text-admin-text">
                          {formatCurrencySync(parseInt(reportData.cash_drawer_expenses) || 0, baseCurrency?.symbol || 'UGX', false)}
                        </p>
                      </div>
                      <div className="border border-admin-text bg-admin-text/5 p-4">
                        <p className="text-xs text-admin-text-secondary mb-2">Total Expenses</p>
                        <p className="text-xl font-bold font-mono text-admin-text">
                          {formatCurrencySync(parseInt(reportData.total_expenses) || 0, baseCurrency?.symbol || 'UGX', false)}
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

                {/* ===== INVOICE REPORTS ===== */}

                {/* Invoice Overview */}
                {selectedReport === "invoices-overview" && reportData && !Array.isArray(reportData) && (
                  <div className="space-y-6">
                    {/* KPI cards */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      {[
                        { label: "Total Invoices", value: reportData.totals?.total_invoices ?? 0, mono: false },
                        { label: "Total Billed", value: formatCurrencySync(parseInt(reportData.totals?.total_billed || 0), baseCurrency?.symbol || 'UGX', false), mono: true },
                        { label: "Total Collected", value: formatCurrencySync(parseInt(reportData.totals?.total_collected || 0), baseCurrency?.symbol || 'UGX', false), mono: true, green: true },
                        { label: "Outstanding", value: formatCurrencySync(parseInt(reportData.totals?.total_outstanding || 0), baseCurrency?.symbol || 'UGX', false), mono: true, red: true },
                      ].map(k => (
                        <div key={k.label} className={`border p-4 ${k.green ? 'border-green-400 bg-green-50' : k.red ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
                          <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                          <p className={`text-xl font-bold ${k.mono ? 'font-mono' : ''} ${k.green ? 'text-green-700' : k.red ? 'text-red-700' : 'text-gray-900'}`}>{k.value}</p>
                        </div>
                      ))}
                    </div>
                    {/* Status counts */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "Paid", val: reportData.totals?.paid_count, color: 'text-green-700', bg: 'bg-green-50 border-green-300' },
                        { label: "Unpaid", val: reportData.totals?.unpaid_count, color: 'text-red-700', bg: 'bg-red-50 border-red-300' },
                        { label: "Partial", val: reportData.totals?.partial_count, color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-300' },
                        { label: "Overdue", val: reportData.totals?.actually_overdue, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-300' },
                      ].map(s => (
                        <div key={s.label} className={`border p-3 ${s.bg}`}>
                          <p className="text-xs text-gray-500">{s.label}</p>
                          <p className={`text-2xl font-bold ${s.color}`}>{s.val ?? 0}</p>
                        </div>
                      ))}
                    </div>
                    {/* By-status breakdown table */}
                    {Array.isArray(reportData.byStatus) && reportData.byStatus.length > 0 && (
                      <ReportTable
                        columns={[
                          { header: 'Status', accessor: 'status', format: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
                          { header: 'Count', accessor: 'invoice_count', align: 'right' },
                          { header: 'Total Billed', accessor: 'total_billed', align: 'right', format: (v) => formatCurrencySync(parseInt(v), baseCurrency?.symbol || 'UGX', false) },
                          { header: 'Total Paid', accessor: 'total_paid', align: 'right', format: (v) => formatCurrencySync(parseInt(v), baseCurrency?.symbol || 'UGX', false) },
                          { header: 'Outstanding', accessor: 'total_outstanding', align: 'right', format: (v) => formatCurrencySync(parseInt(v), baseCurrency?.symbol || 'UGX', false) },
                        ]}
                        data={reportData.byStatus}
                        totalsExclude={['status']}
                      />
                    )}
                  </div>
                )}

                {/* All Invoices */}
                {selectedReport === "invoices-all" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'Invoice #', accessor: 'invoice_number' },
                      { header: 'Customer', accessor: 'customer_name' },
                      { header: 'Phone', accessor: 'customer_phone' },
                      { header: 'Date', accessor: 'date', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
                      { header: 'Due Date', accessor: 'due_date', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
                      { header: 'Total', accessor: 'total_amount', align: 'right', format: (v) => formatCurrencySync(parseInt(v), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Paid', accessor: 'paid_amount', align: 'right', format: (v) => formatCurrencySync(parseInt(v), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Balance', accessor: 'balance_due', align: 'right', format: (v) => formatCurrencySync(parseInt(v), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Status', accessor: 'status', format: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
                    ]}
                    data={reportData}
                    totalsExclude={['invoice_number','customer_name','customer_phone','date','due_date','status']}
                  />
                )}

                {/* Overdue Invoices */}
                {selectedReport === "invoices-overdue" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'Invoice #', accessor: 'invoice_number' },
                      { header: 'Customer', accessor: 'customer_name' },
                      { header: 'Phone', accessor: 'customer_phone' },
                      { header: 'Due Date', accessor: 'due_date', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
                      { header: 'Days Overdue', accessor: 'days_overdue', align: 'right', format: (v) => `${v} days` },
                      { header: 'Total', accessor: 'total_amount', align: 'right', format: (v) => formatCurrencySync(parseInt(v), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Paid', accessor: 'paid_amount', align: 'right', format: (v) => formatCurrencySync(parseInt(v), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Balance Due', accessor: 'balance_due', align: 'right', format: (v) => formatCurrencySync(parseInt(v), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Status', accessor: 'status', format: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
                    ]}
                    data={reportData}
                    totalsExclude={['invoice_number','customer_name','customer_phone','due_date','days_overdue','status']}
                  />
                )}

                {/* Partially Paid */}
                {selectedReport === "invoices-partial" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'Invoice #', accessor: 'invoice_number' },
                      { header: 'Customer', accessor: 'customer_name' },
                      { header: 'Phone', accessor: 'customer_phone' },
                      { header: 'Date', accessor: 'date', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
                      { header: 'Due Date', accessor: 'due_date', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
                      { header: 'Total', accessor: 'total_amount', align: 'right', format: (v) => formatCurrencySync(parseInt(v), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Paid', accessor: 'paid_amount', align: 'right', format: (v) => formatCurrencySync(parseInt(v), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Balance', accessor: 'balance_due', align: 'right', format: (v) => formatCurrencySync(parseInt(v), baseCurrency?.symbol || 'UGX', false) },
                      { header: '% Paid', accessor: 'payment_pct', align: 'right', format: (v) => `${v}%` },
                    ]}
                    data={reportData}
                    totalsExclude={['invoice_number','customer_name','customer_phone','date','due_date','payment_pct']}
                  />
                )}

                {/* Payment Collections */}
                {selectedReport === "invoices-collections" && Array.isArray(reportData) && (
                  <ReportTable
                    columns={[
                      { header: 'Date', accessor: 'payment_date', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
                      { header: 'Invoice #', accessor: 'invoice_number' },
                      { header: 'Customer', accessor: 'customer_name' },
                      { header: 'Method', accessor: 'payment_method' },
                      { header: 'Amount', accessor: 'amount', align: 'right', format: (v) => formatCurrencySync(parseInt(v), baseCurrency?.symbol || 'UGX', false) },
                      { header: 'Notes', accessor: 'notes' },
                    ]}
                    data={reportData}
                    totalsExclude={['payment_date','invoice_number','customer_name','payment_method','notes']}
                  />
                )}

                {/* Sales by Scheme Report */}
                {selectedReport === "sales-by-scheme" && Array.isArray(reportData) && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#2980b9', color: 'white' }}>
                          {['Scheme', 'Currency', 'Sales Count', 'Revenue', 'Tax', 'Discounts', 'Avg Sale'].map((h, i) => (
                            <th key={i} className={`px-4 py-3 font-bold border border-gray-400 ${i >= 2 ? 'text-right' : 'text-left'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((row: any, i: number) => {
                          const sym = row.currency_symbol || baseCurrency?.symbol || 'UGX';
                          return (
                            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f5f5f5' }}>
                              <td className="px-4 py-3 border border-gray-300 text-gray-900">{row.scheme_name}</td>
                              <td className="px-4 py-3 border border-gray-300 text-gray-900">{row.currency_code || baseCurrency?.code || 'UGX'}</td>
                              <td className="px-4 py-3 border border-gray-300 text-right font-mono text-gray-900">{row.total_sales}</td>
                              <td className="px-4 py-3 border border-gray-300 text-right font-mono text-gray-900">{formatCurrencySync(parseInt(row.total_revenue), sym, false)}</td>
                              <td className="px-4 py-3 border border-gray-300 text-right font-mono text-gray-900">{formatCurrencySync(parseInt(row.total_tax), sym, false)}</td>
                              <td className="px-4 py-3 border border-gray-300 text-right font-mono text-gray-900">{formatCurrencySync(parseInt(row.total_discounts), sym, false)}</td>
                              <td className="px-4 py-3 border border-gray-300 text-right font-mono text-gray-900">{formatCurrencySync(Math.round(parseFloat(row.average_sale)), sym, false)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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
