"use client";
import React, { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Expense } from "@/types";
import GlassCard from "@/components/GlassCard";
import Navigation from "@/components/Navigation";
import ExpenseAnalytics from "@/components/ExpenseAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ChartsPage: React.FC = () => {
  const { user } = useAuth();
  const { loading: authLoading } = useProtectedRoute();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">(
    "month"
  );

  // Format currency to Indonesian Rupiah
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Load expenses
  React.useEffect(() => {
    if (!user) return;

    const expensesQuery = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(expensesQuery, (snapshot) => {
      const expensesData: Expense[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        expensesData.push({
          id: doc.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate() : data.date,
        } as Expense);
      });
      // Sort by date descending
      expensesData.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
      setExpenses(expensesData);
    });

    return () => unsubscribe();
  }, [user]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const now = new Date();
    const timeRanges = {
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
    };

    const filteredExpenses = expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= timeRanges[timeRange];
    });

    const expensesData = filteredExpenses.filter((e) => e.type === "expense");
    const incomeData = filteredExpenses.filter((e) => e.type === "income");

    const totalExpenses = expensesData.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = incomeData.reduce((sum, e) => sum + e.amount, 0);
    const netSavings = totalIncome - totalExpenses;

    // Top categories
    const categoryTotals: { [key: string]: number } = {};
    expensesData.forEach((expense) => {
      categoryTotals[expense.category] =
        (categoryTotals[expense.category] || 0) + expense.amount;
    });

    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      totalExpenses,
      totalIncome,
      netSavings,
      topCategories,
      transactionCount: filteredExpenses.length,
    };
  }, [expenses, timeRange]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Memuat...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Navigation />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Analisis Keuangan
                </h1>
                <p className="text-gray-300">
                  Analisis mendalam tentang pengeluaran dan pemasukan Anda
                </p>
              </div>

              <Select
                value={timeRange}
                onValueChange={(value: "week" | "month" | "year") =>
                  setTimeRange(value)
                }
              >
                <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10 text-white">
                  <SelectItem value="week">Minggu Ini</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                  <SelectItem value="year">Tahun Ini</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <GlassCard className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Total Pemasukan</p>
                    <p className="text-2xl font-bold text-green-400">
                      {formatCurrency(summary.totalIncome)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-green-400 text-lg">↑</span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Total Pengeluaran</p>
                    <p className="text-2xl font-bold text-red-400">
                      {formatCurrency(summary.totalExpenses)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-red-400 text-lg">↓</span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Tabungan Bersih</p>
                    <p
                      className={`text-2xl font-bold ${
                        summary.netSavings >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatCurrency(summary.netSavings)}
                    </p>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      summary.netSavings >= 0
                        ? "bg-green-500/20"
                        : "bg-red-500/20"
                    }`}
                  >
                    <span
                      className={
                        summary.netSavings >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {summary.netSavings >= 0 ? "✓" : "!"}
                    </span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Total Transaksi</p>
                    <p className="text-2xl font-bold text-white">
                      {summary.transactionCount}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-blue-400 text-lg">📊</span>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Charts Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10 p-1 rounded-lg">
                <TabsTrigger
                  value="overview"
                  className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white"
                >
                  Ringkasan
                </TabsTrigger>
                <TabsTrigger
                  value="categories"
                  className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white"
                >
                  Kategori
                </TabsTrigger>
                <TabsTrigger
                  value="trends"
                  className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white"
                >
                  Tren
                </TabsTrigger>
                <TabsTrigger
                  value="comparison"
                  className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white"
                >
                  Perbandingan
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <ExpenseAnalytics
                  expenses={expenses}
                  formatCurrency={formatCurrency}
                  timeRange={timeRange}
                  chartType="overview"
                />
              </TabsContent>

              <TabsContent value="categories">
                <ExpenseAnalytics
                  expenses={expenses}
                  formatCurrency={formatCurrency}
                  timeRange={timeRange}
                  chartType="categories"
                />
              </TabsContent>

              <TabsContent value="trends">
                <ExpenseAnalytics
                  expenses={expenses}
                  formatCurrency={formatCurrency}
                  timeRange={timeRange}
                  chartType="trends"
                />
              </TabsContent>

              <TabsContent value="comparison">
                <ExpenseAnalytics
                  expenses={expenses}
                  formatCurrency={formatCurrency}
                  timeRange={timeRange}
                  chartType="comparison"
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartsPage;
