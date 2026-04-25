import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCPerotl_5R8MbW0jl-r8iV-IyP8Lx2vG8",
    authDomain: "asm-hardware-pwa.firebaseapp.com",
    projectId: "asm-hardware-pwa",
    storageBucket: "asm-hardware-pwa.firebasestorage.app",
    messagingSenderId: "133367734881",
    appId: "1:133367734881:web:62f79b94818cf5b9024020",
};

import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

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

    const cats = ['Yellows', 'Oranges', 'Grays & Blacks', 'Browns', 'Whites'];
    const catMap = {};

    console.log("Creating Categories...");
    for (const name of cats) {
        const docRef = await addDoc(collection(db, 'categories'), { name, createdAt: serverTimestamp() });
        catMap[name] = docRef.id;
    }

    const items = [
        { name: 'MALE SUN GOLD', cat: 'Yellows', prices: { ltr: 225, gal: 800, tin: 3320 } },
        { name: 'SMILEY YELLOW', cat: 'Yellows', prices: { ltr: 225, gal: 800, tin: 3320 } },
        { name: 'CROWN SUNRISE', cat: 'Yellows', prices: { ltr: 225, gal: 800, tin: 3320 } },
        { name: 'CHEESE YELLOW', cat: 'Yellows', prices: { ltr: 225, gal: 800, tin: 3320 } },
        { name: 'CALAMANSI', cat: 'Yellows', prices: { ltr: 225, gal: 800, tin: 3320 } },
        { name: 'PEACH', cat: 'Oranges', prices: { ltr: 225, gal: 800, tin: 3320 } },
        { name: 'JOLLY ORANGE', cat: 'Oranges', prices: { ltr: 495, gal: 1925, tin: 7690 } },
        { name: 'SMOKE GRAY', cat: 'Grays & Blacks', prices: { ltr: 225, gal: 800, tin: 3220 } },
        { name: 'SEAL GRAY', cat: 'Grays & Blacks', prices: { ltr: 220, gal: 800, tin: 3290 } },
        { name: 'BLACK', cat: 'Grays & Blacks', prices: { ltr: 220, gal: 800, tin: 3290 } },
        { name: 'SAND BEIGE', cat: 'Browns', prices: { ltr: 220, gal: 810, tin: 3230 } },
        { name: 'MOCHA BLANCH', cat: 'Browns', prices: { ltr: 220, gal: 810, tin: 3230 } },
        { name: 'CHOCO BROWN', cat: 'Browns', prices: { ltr: 220, gal: 810, tin: 3230 } },
        { name: 'SOLO FLAT LATEX WHITE', cat: 'Whites', prices: { gal: 405, tin: 1600 } },
        { name: 'SOLO GLOSS LATEX WHITE', cat: 'Whites', prices: { gal: 565, tin: 2200 } }
    ];

    console.log("Adding Products...");
    for (const item of items) {
        // Create variations (Litre and Gallon) as separate products for the demo
        const base = {
            categoryId: catMap[item.cat],
            stock: 50,
            lowStockThreshold: 10,
            isActive: true,
            createdAt: serverTimestamp()
        };

        if (item.prices.ltr) {
            await addDoc(collection(db, 'products'), {
                ...base,
                name: `${item.name} (1L)`,
                sku: `${item.name.substring(0, 3)}-1L`.toUpperCase(),
                price: item.prices.ltr,
                unit: 'bottle'
            });
        }
        if (item.prices.gal) {
            await addDoc(collection(db, 'products'), {
                ...base,
                name: `${item.name} (Gallon)`,
                sku: `${item.name.substring(0, 3)}-GAL`.toUpperCase(),
                price: item.prices.gal,
                unit: 'gal'
            });
        }
    }

    console.log("Seeding complete!");
    process.exit(0);
}

seed();
