import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDcFkBP_jfuWAAW8NwUzO0UpcifIcfb6iM",
  authDomain: "iic-nst.firebaseapp.com",
  databaseURL: "https://iic-nst-default-rtdb.firebaseio.com",
  projectId: "iic-nst",
  storageBucket: "iic-nst.appspot.com",
  messagingSenderId: "",
  appId: "" 
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and export it
export const db = getDatabase(app);

