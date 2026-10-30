# Capstone Project Video Presentation Script

**Project Title:** Design and Development of a Progressive Web App Sales and Inventory Management System with Context-Aware Assistant (ASM Hardware & General Merchandise)
**Target Duration:** 15 Minutes

---

## A. Team Introduction (Est. 1 Minute)
**[Speaker 1]**
"Good day to our esteemed panelists and viewers. We are [Team Name/Your Names]. Today, we will be presenting our capstone project prototype titled 'Design and Development of a Progressive Web App Sales and Inventory Management System with Context-Aware Assistant,' specifically designed for ASM Hardware & General Merchandise."

---

## B. Problem Statement (Est. 2 Minutes)
**[Speaker 2]**
"Before we dive into the system, let’s briefly discuss the exact problems we aim to solve for ASM Hardware:

1. **Manual Transactions:** The store relies heavily on manual recording of transactions, which makes the process slow and prone to human errors. 
2. **Delayed Inventory Monitoring:** Inventory cannot be monitored in real time, resulting in stock discrepancies, overstocking, out-of-stock items, and delays in restocking. 
3. **Inefficient Sales Processing:** Sales processing is inefficient because product details are written manually, leading to mistakes such as incorrect pricing and missing item records. 
4. **Slow Refunds:** Refund transactions take a long time to process since records must be checked and verified manually. 
5. **Missed Opportunities:** Low-stock items are difficult to identify in a timely manner, which may lead to missed sales opportunities. 
6. **Data Accessibility Issues:** Administrators experience difficulty in accessing accurate and updated data, affecting decision-making and overall business operations.

To solve this, our project introduces a modern Progressive Web App (PWA) that acts as a centralized, offline-capable platform for automated sales, real-time inventory, and intelligent assistance."

---

## C. Prototype Walkthrough (Est. 5 Minutes)
**[Speaker 3]**
*(Action: Screen share or demonstrate the application while speaking)*

"Let’s walk through the core features of our prototype:
1. **Progressive Web App (PWA) Capabilities:** Notice that our application can be installed directly on any device—be it a desktop, tablet, or mobile phone. It loads quickly and provides a native app-like experience.
2. **Admin Dashboard:** Here, the store owner can view a real-time overview of daily sales, low-stock alerts, and overall inventory status. We've designed this with a premium, enterprise-grade aesthetic for high readability.
3. **Inventory Management:** Adding and tracking items is seamless. We included support for product sizes and dimensions, which is crucial for hardware supplies.
4. **Point of Sale (POS):** This is the cashier's interface. It features a built-in barcode scanner using the device's camera for rapid checkout. The system automatically computes totals and generates a professional, thermal-paper style receipt that can be reprinted from the transaction history.
5. **Context-Aware Assistant:** Finally, our integrated AI Chatbot. Staff can interact with this assistant to quickly query stock availability, ask for product specifications, or get troubleshooting advice for hardware tools."

---

## D. Technologies Discussion (Est. 3 Minutes)

**[Speaker 1]**
"Moving on to the technical foundation of our project. We carefully selected our technology stack to ensure scalability, speed, and reliability.

**i. What frameworks, databases, APIs, and servers are we using?**
*   **Programming Languages & Frameworks:** We are using **ReactJS** built with **Vite** as our frontend framework. We also use **Framer Motion** for smooth UI animations and the **Vite PWA plugin** to enable offline capabilities and installability.
*   **Database & Server:** We utilize **Vercel** to host our React frontend for fast, global delivery. For our backend, instead of a traditional local server, we use **Firebase**, specifically **Cloud Firestore**, which acts as our real-time NoSQL database and backend-as-a-service (BaaS). We also use Firebase Authentication for secure access.
*   **APIs & External Services:** We integrated the **NVIDIA AI API (NVIDIA NIM)** to power our Context-Aware Assistant. Additionally, we use the `html5-qrcode` library for our POS camera scanning feature.

**ii. What considerations helped us decide to adopt these technologies?**
*   **React & Vite** were chosen for their blazing-fast performance and component-based architecture, which makes building complex UIs like the POS much easier.
*   We chose **Vercel** because of its seamless integration with Vite and automatic CI/CD deployments. We chose **Firebase Firestore** because it provides out-of-the-box real-time data synchronization. If a cashier makes a sale, the admin dashboard updates instantly without refreshing. Furthermore, Firestore has built-in offline caching, which is perfect for our PWA requirements.
*   We selected the **NVIDIA AI API** because it offers a highly capable, free-tier conversational AI model that easily understands natural language queries, making our assistant truly 'context-aware'."

---

## E. Integration Discussion (Est. 2 Minutes)

**[Speaker 2]**
**How does our frontend interact with the database and APIs?**

"Our system utilizes a **Serverless Architecture**. Because we are using Firebase as our Backend-as-a-Service, our React frontend communicates directly with Cloud Firestore through secure, client-side SDKs. 

1. **Database Integration:** When a cashier processes a transaction in the POS, the React application sends a direct write request to Firestore. Firestore immediately updates the inventory count and pushes the updated data to any connected devices, such as the Admin's dashboard, via WebSockets.
2. **API Integration:** For the AI Assistant, when a user types a query, our frontend application packages the prompt along with relevant context (like the current inventory state, if needed) and sends an HTTP POST request to the **NVIDIA AI API**. The AI processes the query and returns a text response, which is then dynamically rendered in our chatbot interface.
3. **Hardware Integration:** The barcode scanner utilizes the browser's native WebRTC APIs through the `html5-qrcode` library, connecting the device's physical camera directly to our web interface to capture and parse barcode data."

---

## F. Conclusion (Est. 2 Minutes)

**[Speaker 3]**
"To conclude our presentation, we want to address the potential risks and our fallback strategies.

**i. Which integration point is the most expensive or risky?**
"The most risky and potentially expensive integration point is the **NVIDIA AI API**. While there is a free tier currently, scaling this up for heavy daily usage could incur token costs. Furthermore, since it relies entirely on a third-party external server, if the NVIDIA API experiences downtime, our Context-Aware Assistant becomes temporarily unavailable. 

A secondary risk is the **Firebase Firestore database**. Because we rely on real-time listeners, excessive database reads and writes during peak store hours could push us past the free tier quotas if not optimized properly.

**ii. What is our contingency plan for budget constraints?**
"If budget constraints limit our adoption of these technologies, we have clear contingency plans:
1.  **For the AI Assistant:** If the NVIDIA API becomes too costly, our fallback is to implement a local, rule-based chatbot using simple JavaScript logic. It won't be 'generative', but it can still answer predefined FAQs and query the database for product locations based on keywords.
2.  **For Hosting and Database:** We have aggressively implemented local caching and state management to minimize unnecessary reads to Firestore. However, if Vercel or Firebase cloud hosting costs completely exceed the budget, our ultimate fallback is to decouple from cloud services entirely and migrate the backend to a traditional **Node.js or PHP (Laravel/XAMPP)** server with a **MySQL** database running locally on the store's main computer. This eliminates monthly cloud hosting costs, though it trades off remote access capabilities.

**[Speaker 1]**
"That concludes our presentation for the ASM Hardware Sales and Inventory System prototype. Thank you for listening, and we are now open for your questions."
