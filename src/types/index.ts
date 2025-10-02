export interface User {
  uid: string;
  email: string;
  username: string;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: any; // Change from Date to any to handle Firestore Timestamp
  type: "expense" | "income";
  userId: string;
}

export interface Balance {
  current: number;
  lastUpdated: any; // Change from Date to any to handle Firestore Timestamp
  userId: string;
}

// Helper type for Firestore timestamp
export interface Timestamp {
  seconds: number;
  nanoseconds: number;
}
