import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
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

// Use relative paths from the public directory
const IMG_YELLOW = "/products/paint-yellow.png";
const IMG_GRAY = "/products/paint-gray.png";
const IMG_WHITE = "/products/paint-white.png";

async function update() {
    try {
        await signInWithEmailAndPassword(auth, 'admin@asm.com', 'admin1234');
        console.log("Logged in.");

        const snap = await getDocs(collection(db, 'products'));
        for (const d of snap.docs) {
            const data = d.data();
            const name = data.name.toLowerCase();
            let updates = {};

            // Rename to clarify IT IS PAINT
            if (!name.includes('paint') && !name.includes('latex')) {
                updates.name = data.name + ' Finish Paint';
            }

            // Assign Images based on name keywords
            if (name.includes('yellow') || name.includes('gold') || name.includes('calamansi')) {
                updates.imageUrl = IMG_YELLOW;
            } else if (name.includes('gray') || name.includes('black')) {
                updates.imageUrl = IMG_GRAY;
            } else if (name.includes('white') || name.includes('blanc')) {
                updates.imageUrl = IMG_WHITE;
            } else if (name.includes('orange') || name.includes('peach')) {
                // Reuse yellow for now since orange gen failed
                updates.imageUrl = IMG_YELLOW;
            } else if (name.includes('brown')) {
                updates.imageUrl = IMG_GRAY; // Better than nothing, looks dark
            }

            if (Object.keys(updates).length > 0) {
                await updateDoc(doc(db, 'products', d.id), updates);
                console.log(`Updated ${data.name}`);
            }
        }
        console.log("Update Complete!");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

update();
