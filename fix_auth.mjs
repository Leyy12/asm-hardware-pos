import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

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

async function fix() {
    const email = 'cashier@asm.com';
    const pass = 'cashier1234';

    console.log(`Fixing account: ${email}...`);

    let uid;
    try {
        // Try creating first
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        uid = cred.user.uid;
        console.log("Account created from scratch.");
    } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
            console.log("Account exists. Resetting password...");
            // We can't reset without login, but we can delete and recreate if we had admin sdk.
            // Since we don't, I'll just try to login to check if the pass I have is correct.
            try {
                const cred = await signInWithEmailAndPassword(auth, email, pass);
                uid = cred.user.uid;
                console.log("Password is actually correct. Auth is working.");
            } catch (loginErr) {
                console.log("Password incorrect or other auth error:", loginErr.message);
                // Since I can't reset via Client SDK without old pass, I advise the user.
                // UNLESS I use a different email to test.
            }
        } else {
            console.error("Auth error:", e.message);
        }
    }

    if (uid) {
        await setDoc(doc(db, 'users', uid), {
            name: 'Portal Cashier',
            email: email,
            role: 'cashier',
            isActive: true,
            updatedAt: serverTimestamp()
        }, { merge: true });
        console.log("Firestore profile synchronized.");
    }

    console.log("PROCESS ENDED");
    process.exit(0);
}

fix();
