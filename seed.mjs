import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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
    try {
        console.log("Creating Admin...");
        let adminUid;
        try {
            const adminCred = await createUserWithEmailAndPassword(auth, 'admin@asm.com', 'admin1234');
            adminUid = adminCred.user.uid;
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') {
                console.log("Admin email already exists. Skipping auth creation.");
                // We can't get UID if already exists without logging in, but this is a fresh setup.
            } else {
                throw e;
            }
        }

        if (adminUid) {
            await setDoc(doc(db, 'users', adminUid), {
                name: 'Super Admin',
                email: 'admin@asm.com',
                role: 'admin',
                isActive: true,
                createdAt: new Date()
            });
            console.log('Admin successfully registered in Firestore!');
        }

        console.log("Creating Cashier...");
        let cashierUid;
        try {
            const cashierCred = await createUserWithEmailAndPassword(auth, 'cashier@asm.com', 'cashier1234');
            cashierUid = cashierCred.user.uid;
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') {
                console.log("Cashier email already exists.");
            } else {
                throw e;
            }
        }

        if (cashierUid) {
            await setDoc(doc(db, 'users', cashierUid), {
                name: 'Desk Cashier',
                email: 'cashier@asm.com',
                role: 'cashier',
                isActive: true,
                createdAt: new Date()
            });
            console.log('Cashier successfully registered in Firestore!');
        }

        console.log("DONE");
    } catch (e) {
        console.error("FATAL ERROR:", e.message);
    }
    process.exit(0);
}
run();
