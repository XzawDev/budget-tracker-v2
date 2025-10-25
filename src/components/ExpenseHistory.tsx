import React from "react";
import { Expense } from "@/types";
import GlassCard from "./GlassCard";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface ExpenseHistoryProps {
  expenses: Expense[];
  formatCurrency: (amount: number) => string;
  onDeleteExpense: (expense: Expense) => void;
  onEditExpense: (expense: Expense) => void;
}

const ExpenseHistory: React.FC<ExpenseHistoryProps> = ({
  expenses,
  formatCurrency,
  onDeleteExpense,
  onEditExpense,
}) => {
  // Helper function to convert Firestore timestamp to Date
  const convertToDate = (timestamp: any): Date => {
    if (timestamp instanceof Date) {
      return timestamp;
    }
    // If it's a Firestore timestamp with seconds property
    if (timestamp && typeof timestamp === "object" && "seconds" in timestamp) {
      return new Date(timestamp.seconds * 1000);
    }
    // If it's already a valid date string or number
    return new Date(timestamp);
  };

  // Function to translate type to Indonesian
  const translateType = (type: string): string => {
    return type === "income" ? "Pemasukan" : "Pengeluaran";
  };

  const handleDelete = (expense: Expense) => {
    if (
      confirm(
        `Apakah Anda yakin ingin menghapus transaksi "${expense.description}"?`
      )
    ) {
      onDeleteExpense(expense);
    }
  };

  return (
    <GlassCard className="p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Riwayat Transaksi</h2>

      {expenses.length === 0 ? (
        <p className="text-gray-300 text-center py-8">Belum ada transaksi</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white py-3 px-4">Tanggal</th>
                <th className="text-left text-white py-3 px-4">Keterangan</th>
                <th className="text-left text-white py-3 px-4">Kategori</th>
                <th className="text-left text-white py-3 px-4">Jenis</th>
                <th className="text-right text-white py-3 px-4">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => {
                const expenseDate = convertToDate(expense.date);
                return (
                  <ContextMenu key={expense.id}>
                    <ContextMenuTrigger asChild>
                      <tr className="border-b border-white/5 hover:bg-white/5 cursor-context-menu">
                        <td className="py-3 px-4 text-gray-300">
                          {expenseDate.toLocaleDateString("id-ID")}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {expense.description}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {expense.category}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              expense.type === "income"
                                ? "bg-green-500/20 text-green-300"
                                : "bg-red-500/20 text-red-300"
                            }`}
                          >
                            {translateType(expense.type)}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-medium ${
                            expense.type === "income"
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {expense.type === "income" ? "+" : "-"}
                          {formatCurrency(expense.amount)}
                        </td>
                      </tr>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-64 bg-gray-800 border border-white/10 text-white">
                      <ContextMenuItem
                        onClick={() => onEditExpense(expense)}
                        className="cursor-pointer focus:bg-white/10 focus:text-white"
                      >
                        ✏️ Edit Transaksi
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => handleDelete(expense)}
                        className="cursor-pointer text-red-400 focus:bg-red-500/20 focus:text-red-400"
                      >
                        🗑️ Hapus Transaksi
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
};

export default ExpenseHistory;
