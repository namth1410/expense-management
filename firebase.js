import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfrYZa4aj90P3puoBZXcuOYtb9ODmmjo8",
  authDomain: "expense-management-2c2cb.firebaseapp.com",
  databaseURL:
    "https://expense-management-2c2cb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "expense-management-2c2cb",
  storageBucket: "expense-management-2c2cb.appspot.com",
  messagingSenderId: "952359741968",
  appId: "1:952359741968:web:9c9e27c2abcd3d504ef895",
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Firestore
const db = getFirestore(app);

export { db };
