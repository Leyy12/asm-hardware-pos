import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

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

const COLLECTIONS = [
    'products',
    'categories',
    'suppliers',
    'sales',
    'rewardCards',
    'refundExchangeRecords',
    'users',
    'settings'
];

async function run() {
    console.log("Signing in to Firebase...");
    await signInWithEmailAndPassword(auth, 'admin@asm.com', 'admin1234');
    console.log("Signed in successfully!");

    const dataDump = {};

    for (const colName of COLLECTIONS) {
        console.log(`Fetching collection: ${colName}...`);
        const snap = await getDocs(collection(db, colName));
        dataDump[colName] = snap.docs.map(doc => {
            const data = doc.data();
            // Convert timestamps to ISO string or plain objects so they can be JSON serialized
            const cleanData = {};
            for (const key in data) {
                if (data[key] && typeof data[key] === 'object' && typeof data[key].toDate === 'function') {
                    cleanData[key] = {
                        seconds: data[key].seconds,
                        nanoseconds: data[key].nanoseconds,
                        _isTimestamp: true
                    };
                } else {
                    cleanData[key] = data[key];
                }
            }
            return {
                id: doc.id,
                ...cleanData
            };
        });
        console.log(`Fetched ${dataDump[colName].length} documents from ${colName}`);
    }

    const outputDir = path.join(process.cwd(), 'src', 'mockFirebase');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'data.json');
    fs.writeFileSync(outputPath, JSON.stringify(dataDump, null, 2), 'utf-8');
    console.log(`Data successfully dumped to ${outputPath}`);
    process.exit(0);
}

run().catch(err => {
    console.error("Failed to dump data:", err);
    process.exit(1);
});
