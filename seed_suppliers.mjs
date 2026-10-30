import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

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

async function seed() {
    try {
        console.log("Authenticating as Admin...");
        await signInWithEmailAndPassword(auth, 'admin@asm.com', 'admin1234');
        console.log("Auth success.");
    } catch (e) {
        console.error("Auth failed:", e.message);
        process.exit(1);
    }

    const suppliers = [
        {
            name: "XYZ Hardware & General Merchandise",
            contactPerson: "Maria Santos",
            phone: "0928-444-8899",
            email: "xyzhardware@gmail.com",
            address: "Poblacion, Abra de Ilog, Occidental Mindoro",
            isActive: true
        },
        {
            name: "Pacific Paints & Finishes Inc.",
            contactPerson: "Juan Dela Cruz",
            phone: "0917-123-4567",
            email: "sales@pacificpaints.ph",
            address: "Quezon Avenue, Quezon City, Metro Manila",
            isActive: true
        },
        {
            name: "BuildRight Construction Supply",
            contactPerson: "Ana Gonzales",
            phone: "0932-987-6543",
            email: "ana.gonzales@buildright.com",
            address: "Mamburao, Occidental Mindoro",
            isActive: false
        }
    ];

    console.log("Adding Suppliers...");
    for (const supplier of suppliers) {
        try {
            await addDoc(collection(db, 'suppliers'), {
                ...supplier,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            console.log(`Added supplier: ${supplier.name}`);
        } catch (error) {
            console.error(`Error adding ${supplier.name}:`, error);
        }
    }

    console.log("Supplier Seeding complete!");
    process.exit(0);
}

seed();
