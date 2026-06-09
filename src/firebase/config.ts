import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyAb8U53OX0BfaAL3hJ53yDClOupxtnpeKM',
  authDomain: 'filippi-82725.firebaseapp.com',
  databaseURL: 'https://filippi-82725-default-rtdb.firebaseio.com',
  projectId: 'filippi-82725',
  storageBucket: 'filippi-82725.firebasestorage.app',
  messagingSenderId: '62585371869',
  appId: '1:62585371869:web:8770919942c92e673e2f34',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const database = getDatabase(firebaseApp)
