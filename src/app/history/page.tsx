"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Expense } from "@/types";
import GlassCard from "@/components/GlassCard";
import Navigation from "@/components/Navigation";
import ExpenseHistory from "@/components/ExpenseHistory";

// Shadcn UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const { loading: authLoading } = useProtectedRoute();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form states
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
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

  // Update balance function
  const updateBalance = async (newBalance: number) => {
    if (!user) return;
    await updateDoc(doc(db, "balances", user.uid), {
      current: newBalance,
      lastUpdated: new Date(),
      userId: user.uid,
    });
  };

  // Handle delete expense
  const handleDeleteExpense = async (expense: Expense) => {
    if (!user) return;

    try {
      // Calculate balance adjustment (reverse the transaction)
      const balanceAdjustment =
        expense.type === "income" ? -expense.amount : expense.amount;
      const newBalance = balance + balanceAdjustment;

      // Delete the expense from Firestore
      await deleteDoc(doc(db, "expenses", expense.id));

      // Update the balance
      await updateBalance(newBalance);

      console.log("Transaksi berhasil dihapus");
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("Gagal menghapus transaksi");
    }
  };

  // Handle edit expense - open modal with expense data
  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setAmount(expense.amount.toString());
    setDescription(expense.description);
    setCategory(expense.category);
    setType(expense.type);
    setIsEditModalOpen(true);
  };

  // Handle update expense
  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !editingExpense) return;

    setLoading(true);
    const numericAmount = parseFloat(amount);

    try {
      // Calculate balance adjustment
      const oldAmount = editingExpense.amount;
      const oldType = editingExpense.type;
      const newType = type;

      let balanceAdjustment = 0;

      if (oldType === "income" && newType === "income") {
        balanceAdjustment = numericAmount - oldAmount;
      } else if (oldType === "expense" && newType === "expense") {
        balanceAdjustment = oldAmount - numericAmount;
      } else if (oldType === "income" && newType === "expense") {
        balanceAdjustment = -oldAmount - numericAmount;
      } else if (oldType === "expense" && newType === "income") {
        balanceAdjustment = oldAmount + numericAmount;
      }

      const newBalance = balance + balanceAdjustment;

      // Update the expense in Firestore
      await updateDoc(doc(db, "expenses", editingExpense.id), {
        amount: numericAmount,
        description,
        category,
        type,
        date: editingExpense.date, // Keep original date
        userId: user.uid,
      });

      // Update the balance
      await updateBalance(newBalance);

      // Reset form and close modal
      setAmount("");
      setDescription("");
      setCategory("");
      setType("expense");
      setEditingExpense(null);
      setIsEditModalOpen(false);

      console.log("Transaksi berhasil diperbarui");
    } catch (error) {
      console.error("Error updating expense:", error);
      alert("Gagal memperbarui transaksi");
    }
    setLoading(false);
  };

  // Close modal and reset form
  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setEditingExpense(null);
    setAmount("");
    setDescription("");
    setCategory("");
    setType("expense");
  };

  // Load expenses and balance
  useEffect(() => {
    if (!user) return;

    // Listen to balance
    const balanceUnsubscribe = onSnapshot(
      doc(db, "balances", user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setBalance(docSnap.data().current);
        }
      }
    );

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

    return () => {
      balanceUnsubscribe();
      unsubscribe();
    };
  }, [user]);

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
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white">
                Riwayat Transaksi
              </h1>
              <p className="text-gray-300">Semua transaksi keuangan Anda</p>
            </div>

            <ExpenseHistory
              expenses={expenses}
              formatCurrency={formatCurrency}
              onDeleteExpense={handleDeleteExpense}
              onEditExpense={handleEditExpense}
            />
          </div>
        </div>
      </div>

      {/* Edit Expense Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-gray-800 border border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Edit Transaksi
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Ubah detail transaksi Anda
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateExpense} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-white">
                Jumlah
              </Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Masukkan jumlah"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">
                Keterangan
              </Label>
              <Input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Masukkan keterangan"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="text-white">
                Jenis Transaksi
              </Label>
              <Select
                value={type}
                onValueChange={(value: "expense" | "income") => setType(value)}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600 text-white">
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                  <SelectItem value="income">Pemasukan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-white">
                Kategori
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600 text-white">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                className="flex-1 bg-transparent border-gray-600 text-white hover:bg-gray-700"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? "Menyimpan..." : "Perbarui Transaksi"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistoryPage;
