import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: "AIzaSyCPerotl_5R8MbW0jl-r8iV-IyP8Lx2vG8",
    authDomain: "asm-hardware-pwa.firebaseapp.com",
    projectId: "asm-hardware-pwa",
    storageBucket: "asm-hardware-pwa.firebasestorage.app",
    messagingSenderId: "133367734881",
    appId: "1:133367734881:web:62f79b94818cf5b9024020",
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

function generateCardNumber() {
    const seg = () => Math.random().toString(36).substring(2, 6).toUpperCase()
    return `ASM-${seg()}-${seg()}-${seg()}`
}

async function seedRewardCards() {
    try {
        console.log("🔐 Authenticating...")
        await signInWithEmailAndPassword(auth, 'admin@asm.com', 'admin1234')
        console.log("✅ Authenticated!")
        console.log("🌱 Seeding example reward cards...")
        
        const exampleCards = [
            {
                cardNumber: 'ASM-2V0J-KEV4-UVE0',
                customerName: 'Kevin Balquin',
                status: 'active',
                currentPoints: 45,
                pointsToday: 12,
                totalPointsEarned: 45,
                pointsRedeemed: 0,
                lastActivityAt: new Date(2026, 4, 22),
                createdAt: new Date(2026, 4, 16),
                isArchived: false
            },
            {
                cardNumber: generateCardNumber(),
                customerName: 'Maria Santos',
                status: 'active',
                currentPoints: 128,
                pointsToday: 0,
                totalPointsEarned: 200,
                pointsRedeemed: 72,
                lastActivityAt: new Date(2026, 4, 20),
                createdAt: new Date(2026, 4, 5),
                isArchived: false
            },
            {
                cardNumber: generateCardNumber(),
                customerName: 'Juan Dela Cruz',
                status: 'active',
                currentPoints: 87,
                pointsToday: 25,
                totalPointsEarned: 87,
                pointsRedeemed: 0,
                lastActivityAt: new Date(2026, 4, 23),
                createdAt: new Date(2026, 4, 18),
                isArchived: false
            },
            {
                cardNumber: generateCardNumber(),
                customerName: 'Ana Garcia',
                status: 'active',
                currentPoints: 156,
                pointsToday: 8,
                totalPointsEarned: 280,
                pointsRedeemed: 124,
                lastActivityAt: new Date(2026, 4, 19),
                createdAt: new Date(2026, 4, 1),
                isArchived: false
            },
            {
                cardNumber: generateCardNumber(),
                customerName: 'Carlos Mendez',
                status: 'active',
                currentPoints: 42,
                pointsToday: 0,
                totalPointsEarned: 42,
                pointsRedeemed: 0,
                lastActivityAt: new Date(2026, 4, 21),
                createdAt: new Date(2026, 4, 12),
                isArchived: false
            },
            {
                cardNumber: generateCardNumber(),
                customerName: 'Rosa Villanueva',
                status: 'active',
                currentPoints: 203,
                pointsToday: 18,
                totalPointsEarned: 320,
                pointsRedeemed: 117,
                lastActivityAt: new Date(2026, 4, 22),
                createdAt: new Date(2026, 3, 25),
                isArchived: false
            }
        ]

        for (const card of exampleCards) {
            await addDoc(collection(db, 'rewardCards'), {
                ...card,
                createdAt: serverTimestamp(),
                lastActivityAt: card.lastActivityAt ? serverTimestamp() : null
            })
            console.log(`✅ Created reward card for ${card.customerName}`)
        }

        console.log(`\n🎉 Successfully seeded ${exampleCards.length} example reward cards!`)
        process.exit(0)
    } catch (err) {
        console.error("❌ Error seeding rewards:", err)
        process.exit(1)
    }
}

seedRewardCards()
