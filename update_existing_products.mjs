import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, updateDoc, collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';

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

async function run() {
    console.log("Signing in...");
    await signInWithEmailAndPassword(auth, 'admin@asm.com', 'admin1234');
    console.log("Signed in!");

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

    const prodSnap = await getDocs(collection(db, 'products'));
    const catSnap = await getDocs(collection(db, 'categories'));
    const categories = catSnap.docs.reduce((acc, d) => ({ ...acc, [d.id]: d.data().name }), {});
    
    console.log(`Found ${prodSnap.size} products to check.`);
    
    let updatedCount = 0;
    for (const d of prodSnap.docs) {
        const data = d.data();
        const catName = categories[data.categoryId] || '';
        const targetSupplier = getSupplierInfo(data.name, catName);
        const supplierId = supplierMap[targetSupplier] || '';

        console.log(`Updating product "${data.name}" with supplier "${targetSupplier}"...`);
        await updateDoc(doc(db, 'products', d.id), {
            supplierId: supplierId,
            supplierName: targetSupplier
        });
        updatedCount++;
    }

    console.log(`Successfully updated ${updatedCount} products with diverse paint suppliers!`);
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
