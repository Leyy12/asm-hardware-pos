import { initializeApp } from 'firebase/app';
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

async function inspect() {
    const cred = await signInWithEmailAndPassword(auth, 'cashier@asm.com', 'cashier1234');
    console.log(`Email: ${cred.user.email}, UID: ${cred.user.uid}`);
    process.exit(0);
}

inspect().catch(err => {
    console.error(err);
    process.exit(1);
});
