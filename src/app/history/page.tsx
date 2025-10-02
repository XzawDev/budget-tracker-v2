"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Expense } from "@/types";
import GlassCard from "@/components/GlassCard";
import Navigation from "@/components/Navigation";
import ExpenseHistory from "@/components/ExpenseHistory";

const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const { loading: authLoading } = useProtectedRoute();
  const [expenses, setExpenses] = useState<Expense[]>([]);

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
  useEffect(() => {
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
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
