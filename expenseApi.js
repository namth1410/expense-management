import { db } from "./firebase"; // Đường dẫn này tùy thuộc vào vị trí file firebaseConfig.js
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
} from "firebase/firestore";

export const listenToExpenses = (callback) => {
  const expensesCol = collection(db, "expenses");
  return onSnapshot(expensesCol, (snapshot) => {
    const expenseList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(expenseList);
  });
};

// Lấy danh sách các chi phí
export const getExpenses = async () => {
  const expensesCol = collection(db, "expenses"); // 'expenses' là tên collection trong Firestore
  const expensesSnapshot = await getDocs(expensesCol);
  const expenseList = expensesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  return expenseList;
};

// Cập nhật một chi phí
export const updateExpense = async (id, updatedData) => {
  const expenseDocRef = doc(db, "expenses", id); // Lấy reference đến document với id cụ thể
  await updateDoc(expenseDocRef, updatedData);
};

// Xóa một chi phí
export const deleteExpense = async (id) => {
  const expenseDocRef = doc(db, "expenses", id);
  await deleteDoc(expenseDocRef);
};

// Tạo mới một chi phí
export const createExpense = async (expenseData) => {
  const expensesCol = collection(db, "expenses");
  const newExpenseRef = await addDoc(expensesCol, expenseData);
  return { id: newExpenseRef.id, ...expenseData };
};
