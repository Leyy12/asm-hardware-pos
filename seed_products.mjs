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

    console.log("Finding or seeding paint suppliers...");
    const paintSuppliers = [
        { name: 'Boysen Paints Philippines', contact: 'Juan Dela Cruz', phone: '0917-123-4567', email: 'sales@boysen.com.ph' },
        { name: 'Davies Paints Philippines, Inc.', contact: 'Maria Santos', phone: '0928-444-8899', email: 'info@daviespaints.com.ph' },
        { name: 'Nippon Paint Philippines', contact: 'Kenji Sato', phone: '0932-987-6543', email: 'contact@nipponpaint.ph' },
        { name: 'Island Paints (Charter Chemical)', contact: 'Ana Gonzales', phone: '0945-333-2211', email: 'support@islandpaints.com' },
        { name: 'Universal Paint & Coatings', contact: 'Robert Lim', phone: '0908-111-2222', email: 'sales@universalpaint.ph' }
    ];
    
    const supplierMap = {};
    for (const sup of paintSuppliers) {
        const snap = await getDocs(query(collection(db, 'suppliers'), where('name', '==', sup.name)));
        if (!snap.empty) {
            supplierMap[sup.name] = snap.docs[0].id;
            console.log(`Found existing supplier: ${sup.name} (ID: ${snap.docs[0].id})`);
        } else {
            const docRef = await addDoc(collection(db, 'suppliers'), {
                name: sup.name,
                contactPerson: sup.contact,
                phone: sup.phone,
                email: sup.email,
                address: "Manila, Philippines",
                isActive: true,
                isArchived: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            supplierMap[sup.name] = docRef.id;
            console.log(`Created new supplier: ${sup.name} (ID: ${docRef.id})`);
        }
    }

    // Helper to get the correct supplier name
    function getSupplierInfo(itemName, catName) {
        const name = (itemName || '').toLowerCase();
        const cat = (catName || '').toLowerCase();
        
        if (name.includes('solo') || cat.includes('white')) {
            return 'Boysen Paints Philippines';
        } else if (name.includes('black') || name.includes('smoke') || name.includes('seal') || cat.includes('gray') || cat.includes('black')) {
            return 'Davies Paints Philippines, Inc.';
        } else if (name.includes('mocha') || name.includes('choco') || name.includes('sand') || cat.includes('brown')) {
            return 'Nippon Paint Philippines';
        } else if (name.includes('smiley') || name.includes('sun') || name.includes('calamansi') || cat.includes('yellow')) {
            return 'Island Paints (Charter Chemical)';
        } else {
            return 'Universal Paint & Coatings';
        }
    }

    console.log("Adding Products...");
    for (const item of items) {
        const supName = getSupplierInfo(item.name, item.cat);
        const supId = supplierMap[supName] || '';

        // Create variations (Litre and Gallon) as separate products for the demo
        const base = {
            categoryId: catMap[item.cat],
            stock: 50,
            lowStockThreshold: 10,
            isActive: true,
            supplierId: supId,
            supplierName: supName,
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
