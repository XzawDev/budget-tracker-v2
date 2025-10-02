"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Expense, Balance } from "@/types";
import GlassCard from "@/components/GlassCard";
import Button from "@/components/Button";
import ExpenseHistory from "@/components/ExpenseHistory";
import ExpenseChart from "@/components/ExpenseChart";
import Navigation from "@/components/Navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

// Shadcn UI Components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, CreditCard } from "lucide-react";

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { loading: authLoading } = useProtectedRoute();

  const [balance, setBalance] = useState<number>(0);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  // Categories for selection
  const categories = [
    "Makanan",
    "Transportasi",
    "Alfamart",
    "Hiburan",
    "Kebutuhan",
    "Lainnya",
  ];

  // Format currency to Indonesian Rupiah
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate quick stats
  const stats = React.useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weeklyExpenses = expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= oneWeekAgo && expense.type === "expense";
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    const monthlyExpenses = expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= oneMonthAgo && expense.type === "expense";
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    const monthlyIncome = expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= oneMonthAgo && expense.type === "income";
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    return {
      weeklyExpenses,
      monthlyExpenses,
      monthlyIncome,
      totalTransactions: expenses.length,
    };
  }, [expenses]);

  // Move ALL hooks to the top level - no conditional hook calls
  useEffect(() => {
    // Only setup Firebase listeners if user exists
    if (!user) return;

    // Listen to balance changes
    const balanceDoc = doc(db, "balances", user.uid);
    getDoc(balanceDoc).then((docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().current);
      } else {
        setDoc(balanceDoc, {
          current: 0,
          lastUpdated: new Date(),
          userId: user.uid,
        });
      }
    });

    const unsubscribeBalance = onSnapshot(balanceDoc, (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().current);
      }
    });

    // Listen to expenses with error handling for index
    const expensesQuery = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid)
    );

    const unsubscribeExpenses = onSnapshot(
      expensesQuery,
      (snapshot) => {
        const expensesData: Expense[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          expensesData.push({
            id: doc.id,
            ...data,
            date: data.date?.toDate ? data.date.toDate() : data.date,
          } as Expense);
        });
        // Sort by date descending locally
        expensesData.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });
        setExpenses(expensesData);
      },
      (error) => {
        console.error("Error fetching expenses:", error);
      }
    );

    return () => {
      unsubscribeBalance();
      unsubscribeExpenses();
    };
  }, [user]); // Add user as dependency

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Memuat...</div>
      </div>
    );
  }

  // Don't render dashboard if no user (will be redirected by useProtectedRoute)
  if (!user) {
    return null;
  }

  const updateBalance = async (newBalance: number) => {
    if (!user) return;
    await setDoc(doc(db, "balances", user.uid), {
      current: newBalance,
      lastUpdated: new Date(),
      userId: user.uid,
    });
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount) return;

    setLoading(true);
    const numericAmount = parseFloat(amount);
    const finalAmount = type === "expense" ? -numericAmount : numericAmount;

    try {
      // Add expense record
      await addDoc(collection(db, "expenses"), {
        amount: numericAmount,
        description,
        category,
        date: new Date(),
        type,
        userId: user.uid,
      });

      // Update balance
      const newBalance = balance + finalAmount;
      await updateBalance(newBalance);

      // Reset form
      setAmount("");
      setDescription("");
      setCategory("");
      setType("expense");
    } catch (error) {
      console.error("Error adding expense:", error);
    }
    setLoading(false);
  };

  const handleAddBalance = async () => {
    if (!user || !amount) return;
    const numericAmount = parseFloat(amount);
    await updateBalance(balance + numericAmount);
    setAmount("");
  };

  const handleDeductBalance = async () => {
    if (!user || !amount) return;
    const numericAmount = parseFloat(amount);
    await updateBalance(balance - numericAmount);
    setAmount("");
  };

  const handleRestartBalance = async () => {
    if (!user) return;
    if (confirm("Apakah Anda yakin ingin mengatur ulang saldo menjadi 0?")) {
      await updateBalance(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Navigation />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Dasbor Keuangan
                </h1>
                <p className="text-gray-300">
                  Selamat datang kembali, {user.username}!
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <GlassCard className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Saldo Saat Ini</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(balance)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">
                      Pengeluaran Minggu Ini
                    </p>
                    <p className="text-2xl font-bold text-red-400">
                      {formatCurrency(stats.weeklyExpenses)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Pemasukan Bulan Ini</p>
                    <p className="text-2xl font-bold text-green-400">
                      {formatCurrency(stats.monthlyIncome)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Total Transaksi</p>
                    <p className="text-2xl font-bold text-white">
                      {stats.totalTransactions}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Balance Management Card */}
              <GlassCard className="p-6 lg:col-span-1">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Kelola Saldo
                </h2>
                <div className="text-4xl font-bold text-white mb-6">
                  {formatCurrency(balance)}
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Jumlah"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleAddBalance}
                      variant="primary"
                      className="w-full"
                    >
                      Tambah
                    </Button>
                    <Button
                      onClick={handleDeductBalance}
                      variant="secondary"
                      className="w-full"
                    >
                      Kurangi
                    </Button>
                  </div>
                  <Button
                    onClick={handleRestartBalance}
                    variant="danger"
                    className="w-full"
                  >
                    Atur Ulang Saldo
                  </Button>
                </div>
              </GlassCard>

              {/* Add Expense/Income Card */}
              <GlassCard className="p-6 lg:col-span-2">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Catat Transaksi Baru
                </h2>
                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        Jumlah
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
                        placeholder="Masukkan jumlah"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        Jenis
                      </label>
                      <Select
                        value={type}
                        onValueChange={(value: "expense" | "income") =>
                          setType(value)
                        }
                      >
                        <SelectTrigger className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white">
                          <SelectValue placeholder="Pilih jenis" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border border-white/10 text-white">
                          <SelectItem value="expense">Pengeluaran</SelectItem>
                          <SelectItem value="income">Pemasukan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Keterangan
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
                      placeholder="Masukkan keterangan"
                    />
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Kategori
                    </label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white">
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border border-white/10 text-white">
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Mencatat..." : "Catat Transaksi"}
                  </Button>
                </form>
              </GlassCard>
            </div>

            {/* Quick Chart Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              {/* <GlassCard className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Ringkasan Pengeluaran
                </h2>
                <ExpenseChart
                  expenses={expenses}
                  formatCurrency={formatCurrency}
                />
              </GlassCard> */}

              {/* Recent Transactions */}
              {/* <GlassCard className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Transaksi Terbaru
                </h2>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {expenses.slice(0, 5).map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            expense.type === "income"
                              ? "bg-green-500/20"
                              : "bg-red-500/20"
                          }`}
                        >
                          {expense.type === "income" ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {expense.description || "Tidak ada keterangan"}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {expense.category} •{" "}
                            {new Date(expense.date).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`text-right ${
                          expense.type === "income"
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        <p className="font-semibold">
                          {expense.type === "income" ? "+" : "-"}
                          {formatCurrency(expense.amount)}
                        </p>
                        <p className="text-gray-400 text-sm capitalize">
                          {expense.type === "income"
                            ? "Pemasukan"
                            : "Pengeluaran"}
                        </p>
                      </div>
                    </div>
                  ))}
                  {expenses.length === 0 && (
                    <p className="text-gray-400 text-center py-4">
                      Belum ada transaksi
                    </p>
                  )}
                </div>
              </GlassCard> */}
            </div>

            {/* Full Expense History */}
            <div>
              <ExpenseHistory
                expenses={expenses}
                formatCurrency={formatCurrency}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
