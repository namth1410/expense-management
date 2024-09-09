import { db } from "./firebase"; // Đường dẫn này tùy thuộc vào vị trí file firebaseConfig.js

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  query,
  where,
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
  // Tạo truy vấn với sắp xếp theo dateCreated từ mới nhất đến cũ nhất
  const expensesQuery = query(
    collection(db, "expenses"),
    orderBy("dateCreated", "desc") // 'desc' để sắp xếp từ mới nhất đến cũ nhất
  );

  const expensesSnapshot = await getDocs(expensesQuery);
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

export async function savePushTokenToDatabase(expoPushToken) {
  try {
    const tokensRef = collection(db, "expoPushTokens");
    const q = query(tokensRef, where("expoPushToken", "==", expoPushToken));

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      await addDoc(tokensRef, {
        expoPushToken: expoPushToken,
      });
      console.log("Token saved to database!");
    } else {
      console.log("Token already exists in the database.");
    }
  } catch (error) {
    console.error("Error saving token to database: ", error);
  }
}

export async function getAllPushTokens() {
  const querySnapshot = await getDocs(collection(db, "expoPushTokens"));
  const expoPushTokens = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.expoPushToken) {
      expoPushTokens.push(data.expoPushToken);
    }
  });
  return expoPushTokens;
}
