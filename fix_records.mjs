import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCPerotl_5R8MbW0jl-r8iV-IyP8Lx2vG8",
    authDomain: "asm-hardware-pwa.firebaseapp.com",
    projectId: "asm-hardware-pwa",
    storageBucket: "asm-hardware-pwa.firebasestorage.app",
    messagingSenderId: "133367734881",
    appId: "1:133367734881:web:62f79b94818cf5b9024020",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
    console.log("Signing in...");
    await signInWithEmailAndPassword(auth, 'cashier@asm.com', 'cashier1234');
    console.log("Signed in!");

    // Update refundExchangeRecords where cashierName is 'Cashier User'
    const q = query(collection(db, 'refundExchangeRecords'), where('cashierName', '==', 'Cashier User'));
    const snap = await getDocs(q);
    console.log(`Found ${snap.size} records to update in refundExchangeRecords.`);
    
    for (const d of snap.docs) {
        console.log(`Updating record ${d.id}...`);
        await updateDoc(doc(db, 'refundExchangeRecords', d.id), {
            cashierName: 'July Lee',
            notes: d.data().notes ? d.data().notes.replace('Cashier User', 'July Lee') : 'Replacement completed by July Lee'
        });
    }

    console.log("Finished updating!");
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
