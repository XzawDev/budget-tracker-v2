"use client";
import React, { useMemo } from "react";
import { Expense } from "@/types";
import GlassCard from "./GlassCard";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";
import {
  format,
  subDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  subMonths,
} from "date-fns";
import { id } from "date-fns/locale";

interface ExpenseAnalyticsProps {
  expenses: Expense[];
  formatCurrency: (amount: number) => string;
  timeRange: "week" | "month" | "year";
  chartType: "overview" | "categories" | "trends" | "comparison";
}

const ExpenseAnalytics: React.FC<ExpenseAnalyticsProps> = ({
  expenses,
  formatCurrency,
  timeRange,
  chartType,
}) => {
  // Color palettes
  const CATEGORY_COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff8042",
    "#0088fe",
    "#00c49f",
    "#ffbb28",
    "#ff8042",
    "#a4de6c",
    "#d0ed57",
  ];

  const INCOME_EXPENSE_COLORS = {
    income: "#82ca9d",
    expense: "#ff8042",
  };

  // Process data based on time range and chart type
  const chartData = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "week":
        startDate = subDays(now, 7);
        break;
      case "month":
        startDate = subDays(now, 30);
        break;
      case "year":
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = subDays(now, 30);
    }

    const filteredExpenses = expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startDate && expenseDate <= now;
    });

    // Overview Chart Data (Income vs Expense over time)
    if (chartType === "overview") {
      const days = eachDayOfInterval({ start: startDate, end: now });

      return days.map((day) => {
        const dayExpenses = filteredExpenses.filter((expense) => {
          const expenseDate = new Date(expense.date);
          return (
            format(expenseDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
          );
        });

        const income = dayExpenses
          .filter((e) => e.type === "income")
          .reduce((sum, e) => sum + e.amount, 0);

        const expense = dayExpenses
          .filter((e) => e.type === "expense")
          .reduce((sum, e) => sum + e.amount, 0);

        return {
          date: format(day, "MMM dd", { locale: id }),
          fullDate: day,
          pemasukan: income,
          pengeluaran: expense,
          saldo: income - expense,
        };
      });
    }

    // Categories Chart Data
    if (chartType === "categories") {
      const categoryTotals: { [key: string]: number } = {};
      filteredExpenses
        .filter((e) => e.type === "expense")
        .forEach((expense) => {
          categoryTotals[expense.category] =
            (categoryTotals[expense.category] || 0) + expense.amount;
        });

      return Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value], index) => ({
          name,
          value,
          fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }));
    }

    // Trends Chart Data (Monthly trends)
    if (chartType === "trends") {
      const months = eachMonthOfInterval({
        start: subMonths(now, 11),
        end: now,
      });

      return months.map((month) => {
        const monthExpenses = filteredExpenses.filter((expense) => {
          const expenseDate = new Date(expense.date);
          return format(expenseDate, "yyyy-MM") === format(month, "yyyy-MM");
        });

        const income = monthExpenses
          .filter((e) => e.type === "income")
          .reduce((sum, e) => sum + e.amount, 0);

        const expense = monthExpenses
          .filter((e) => e.type === "expense")
          .reduce((sum, e) => sum + e.amount, 0);

        return {
          bulan: format(month, "MMM yyyy", { locale: id }),
          pemasukan: income,
          pengeluaran: expense,
          rasio: income > 0 ? (expense / income) * 100 : 0,
        };
      });
    }

    // Comparison Chart Data (Category comparison over time)
    if (chartType === "comparison") {
      const categories = Array.from(
        new Set(
          filteredExpenses
            .filter((e) => e.type === "expense")
            .map((e) => e.category)
        )
      ).slice(0, 5);

      const periods =
        timeRange === "week"
          ? eachDayOfInterval({ start: startDate, end: now })
          : eachMonthOfInterval({ start: startDate, end: now });

      return periods.map((period) => {
        const periodData: any = {
          periode:
            timeRange === "week"
              ? format(period, "dd MMM", { locale: id })
              : format(period, "MMM yyyy", { locale: id }),
        };

        categories.forEach((category) => {
          const categoryExpenses = filteredExpenses.filter((expense) => {
            const expenseDate = new Date(expense.date);
            const matchesCategory =
              expense.category === category && expense.type === "expense";
            const matchesPeriod =
              timeRange === "week"
                ? format(expenseDate, "yyyy-MM-dd") ===
                  format(period, "yyyy-MM-dd")
                : format(expenseDate, "yyyy-MM") === format(period, "yyyy-MM");

            return matchesCategory && matchesPeriod;
          });

          periodData[category] = categoryExpenses.reduce(
            (sum, e) => sum + e.amount,
            0
          );
        });

        return periodData;
      });
    }

    return [];
  }, [expenses, timeRange, chartType]);

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800/90 backdrop-blur-sm border border-white/20 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render different charts based on chartType
  const renderChart = () => {
    switch (chartType) {
      case "overview":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => {
                  if (value >= 1000000)
                    return `Rp${(value / 1000000).toFixed(0)}Jt`;
                  if (value >= 1000) return `Rp${(value / 1000).toFixed(0)}Rb`;
                  return `Rp${value}`;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="pengeluaran"
                fill={INCOME_EXPENSE_COLORS.expense}
                name="Pengeluaran"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="pemasukan"
                fill={INCOME_EXPENSE_COLORS.income}
                name="Pemasukan"
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="saldo"
                stroke="#8884d8"
                strokeWidth={2}
                name="Saldo Bersih"
                dot={{ fill: "#8884d8", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case "categories":
        return (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-2/3 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#9CA3AF"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => {
                      if (value >= 1000000)
                        return `Rp${(value / 1000000).toFixed(0)}Jt`;
                      if (value >= 1000)
                        return `Rp${(value / 1000).toFixed(0)}Rb`;
                      return `Rp${value}`;
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="lg:w-1/3 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} (${((percent as number) * 100).toFixed(0)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case "trends":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis dataKey="bulan" stroke="#9CA3AF" fontSize={12} />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => {
                  if (value >= 1000000)
                    return `Rp${(value / 1000000).toFixed(0)}Jt`;
                  if (value >= 1000) return `Rp${(value / 1000).toFixed(0)}Rb`;
                  return `Rp${value}`;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="pemasukan"
                stackId="1"
                stroke={INCOME_EXPENSE_COLORS.income}
                fill={INCOME_EXPENSE_COLORS.income}
                fillOpacity={0.6}
                name="Pemasukan"
              />
              <Area
                type="monotone"
                dataKey="pengeluaran"
                stackId="1"
                stroke={INCOME_EXPENSE_COLORS.expense}
                fill={INCOME_EXPENSE_COLORS.expense}
                fillOpacity={0.6}
                name="Pengeluaran"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "comparison":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis dataKey="periode" stroke="#9CA3AF" fontSize={12} />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => {
                  if (value >= 1000000)
                    return `Rp${(value / 1000000).toFixed(0)}Jt`;
                  if (value >= 1000) return `Rp${(value / 1000).toFixed(0)}Rb`;
                  return `Rp${value}`;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {chartData.length > 0 &&
                Object.keys(chartData[0])
                  .filter((key) => key !== "periode")
                  .map((category, index) => (
                    <Line
                      key={category}
                      type="monotone"
                      dataKey={category}
                      stroke={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      strokeWidth={2}
                      name={category}
                      dot={{
                        fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                        strokeWidth: 2,
                      }}
                    />
                  ))}
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  if (expenses.length === 0) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-8">
          <p className="text-gray-300 text-lg mb-4">Belum ada data transaksi</p>
          <p className="text-gray-400 text-sm">
            Mulai catat transaksi Anda untuk melihat analisis yang mendalam
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white mb-2">
          {chartType === "overview" && "Ringkasan Keuangan"}
          {chartType === "categories" && "Analisis Kategori"}
          {chartType === "trends" && "Tren Pengeluaran"}
          {chartType === "comparison" && "Perbandingan Kategori"}
        </h3>
        <p className="text-gray-300 text-sm">
          {chartType === "overview" &&
            "Pemasukan vs Pengeluaran dan saldo bersih over time"}
          {chartType === "categories" &&
            "Distribusi pengeluaran berdasarkan kategori"}
          {chartType === "trends" && "Tren pemasukan dan pengeluaran bulanan"}
          {chartType === "comparison" &&
            "Perbandingan pengeluaran kategori over time"}
        </p>
      </div>

      {renderChart()}

      <div className="mt-4 text-xs text-gray-400">
        <p>
          Data berdasarkan periode:{" "}
          {timeRange === "week"
            ? "7 hari terakhir"
            : timeRange === "month"
            ? "30 hari terakhir"
            : "12 bulan terakhir"}
        </p>
      </div>
    </GlassCard>
  );
};

export default ExpenseAnalytics;
