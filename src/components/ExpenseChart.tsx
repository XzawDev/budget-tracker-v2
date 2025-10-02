"use client";
import React, { useMemo } from "react";
import { Expense } from "@/types";
import GlassCard from "./GlassCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ExpenseChartProps {
  expenses: Expense[];
  formatCurrency: (amount: number) => string;
}

const ExpenseChart: React.FC<ExpenseChartProps> = ({
  expenses,
  formatCurrency,
}) => {
  const chartData = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weeklyExpenses = expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= oneWeekAgo && expense.type === "expense";
    });

    const categoryTotals: { [key: string]: number } = {};
    weeklyExpenses.forEach((expense) => {
      categoryTotals[expense.category] =
        (categoryTotals[expense.category] || 0) + expense.amount;
    });

    return Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({
        name,
        value,
      }));
  }, [expenses]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800/90 backdrop-blur-sm border border-white/20 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold">{label}</p>
          <p className="text-purple-300">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  if (expenses.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-gray-400">Belum ada data pengeluaran</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
        <YAxis
          stroke="#9CA3AF"
          fontSize={12}
          tickFormatter={(value) => {
            if (value >= 1000000) return `Rp${(value / 1000000).toFixed(0)}Jt`;
            if (value >= 1000) return `Rp${(value / 1000).toFixed(0)}Rb`;
            return `Rp${value}`;
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ExpenseChart;
