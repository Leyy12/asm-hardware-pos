import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
    await signInWithEmailAndPassword(auth, 'admin@asm.com', 'admin1234');
    console.log("Signed in!");

    const prodSnap = await getDocs(collection(db, 'products'));
    console.log(`Found ${prodSnap.size} products.`);
    prodSnap.docs.forEach(d => {
        const data = d.data();
        console.log(`Product: ${data.name}, SKU: ${data.sku}, CategoryId: ${data.categoryId}, SupplierId: ${data.supplierId || 'None'}, SupplierName: ${data.supplierName || 'None'}`);
    });

    const supSnap = await getDocs(collection(db, 'suppliers'));
    console.log(`\nFound ${supSnap.size} suppliers.`);
    supSnap.docs.forEach(d => {
        const data = d.data();
        console.log(`Supplier: ${data.name}, ID: ${d.id}`);
    });

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
