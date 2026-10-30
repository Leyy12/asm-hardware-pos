import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
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

function generateTransactionId(date) {
    const y = date.getFullYear().toString().slice(-2);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ASM-${y}${m}${d}-${rand}`;
}

async function run() {
    try {
        console.log("🔐 Authenticating...");
        const adminCred = await signInWithEmailAndPassword(auth, 'admin@asm.com', 'admin1234');
        console.log("✅ Authenticated!");

        console.log("Fetching products...");
        const prodSnap = await getDocs(collection(db, 'products'));
        const products = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (products.length === 0) {
            console.error("No products found! Please run seed_products.mjs first.");
            process.exit(1);
        }
        console.log(`Loaded ${products.length} products.`);

        // We will seed sales for the last 7 days (including today)
        console.log("Generating sales transactions...");
        let totalSalesGenerated = 0;
        
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            // Set random hour during store operations (8 AM to 6 PM)
            
            // Generate 3 to 6 sales per day
            const salesCount = 3 + Math.floor(Math.random() * 4);
            console.log(`Seeding ${salesCount} sales for ${date.toDateString()}...`);
            
            for (let s = 0; s < salesCount; s++) {
                const saleDate = new Date(date);
                saleDate.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
                
                // Pick 1 to 3 random products
                const itemCount = 1 + Math.floor(Math.random() * 3);
                const selectedItems = [];
                let subtotal = 0;
                
                // Shuffle/pick unique products
                const shuffled = [...products].sort(() => 0.5 - Math.random());
                for (let k = 0; k < Math.min(itemCount, shuffled.length); k++) {
                    const p = shuffled[k];
                    const qty = 1 + Math.floor(Math.random() * 3);
                    const itemSubtotal = qty * p.price;
                    subtotal += itemSubtotal;
                    selectedItems.push({
                        productId: p.id,
                        name: p.name,
                        qty,
                        price: p.price,
                        subtotal: itemSubtotal
                    });
                    
                    // Update stock locally so we can track and write back if we want, or just let POS handle checkout deduction
                    // Since it's a seed script, we'll update the stock in Firestore as well to keep it consistent
                    p.stock = Math.max(0, p.stock - qty);
                    await updateDoc(doc(db, 'products', p.id), {
                        stock: p.stock
                    });
                }
                
                const total = subtotal;
                const paymentAmount = Math.ceil(total / 100) * 100;
                const change = paymentAmount - total;
                const transactionId = generateTransactionId(saleDate);
                
                const saleDoc = {
                    transactionId,
                    cashierId: adminCred.user.uid,
                    cashierName: 'Super Admin',
                    items: selectedItems,
                    subtotal,
                    pointsEarned: 0,
                    rewardCardNumber: '',
                    rewardCardCustomer: '',
                    total,
                    tendered: paymentAmount,
                    change,
                    paymentMethod: 'cash',
                    status: 'completed',
                    createdAt: Timestamp.fromDate(saleDate)
                };
                
                await addDoc(collection(db, 'sales'), saleDoc);
                totalSalesGenerated++;
            }
        }
        
        console.log(`🎉 Successfully seeded ${totalSalesGenerated} sales transactions and updated product stocks!`);
        process.exit(0);
    } catch (e) {
        console.error("FATAL ERROR seeding sales:", e);
        process.exit(1);
    }
}

run();
