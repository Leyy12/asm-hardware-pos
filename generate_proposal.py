from docx import Document
from docx.shared import Pt, Inches, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

doc = Document()

# --- Page Margins ---
for section in doc.sections:
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(3)
    section.right_margin = Cm(2.5)

# --- Helper to set table cell background ---
def set_cell_bg(cell, hex_color):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)

def set_cell_borders(cell, top=True, bottom=True, left=True, right=True):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for side, show in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        border = OxmlElement(f'w:{side}')
        if show:
            border.set(qn('w:val'), 'single')
            border.set(qn('w:sz'), '4')
            border.set(qn('w:space'), '0')
            border.set(qn('w:color'), '000000')
        else:
            border.set(qn('w:val'), 'nil')
        tcBorders.append(border)
    tcPr.append(tcBorders)

# ========== HEADER ==========
title_p = doc.add_paragraph()
title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
title_run = title_p.add_run("RESEARCH PROPOSAL")
title_run.bold = True
title_run.font.size = Pt(14)

doc.add_paragraph()

# --- Research Title (Revised to exclude abbreviations, use Mobile Computing & include key technologies) ---
t = doc.add_paragraph()
t.alignment = WD_ALIGN_PARAGRAPH.LEFT
r = t.add_run("Research Title: ")
r.bold = True
r.font.size = Pt(11)
r2 = t.add_run("Design and Development of an API-Based, Security-Hardened Mobile Computing Sales and Inventory Management System with Data-as-a-Service (DaaS) Architecture and Intelligent Product Recommendation for Multi-Business SMEs")
r2.font.size = Pt(11)

doc.add_paragraph()

p = doc.add_paragraph()
r = p.add_run("Proponents:")
r.bold = True
r.font.size = Pt(11)
for i in range(1, 4):
    p2 = doc.add_paragraph()
    p2.paragraph_format.left_indent = Inches(0.3)
    r2 = p2.add_run(f"{i}. {'_' * 40}")
    r2.font.size = Pt(11)

doc.add_paragraph()

for label in ["Adviser", "Data Analyst", "Critic Reader"]:
    p = doc.add_paragraph()
    r1 = p.add_run(f"{label}: ")
    r1.bold = True
    r1.font.size = Pt(11)
    r2 = p.add_run("_" * 35)
    r2.font.size = Pt(11)

doc.add_paragraph()

# --- Priority Areas ---
p = doc.add_paragraph()
r = p.add_run("Priority Area/s (check the applicable):")
r.bold = True
r.font.size = Pt(11)

CHECKED = "[X]"
UNCHECKED = "[ ]"

priority_areas = [
    ("1. Natural & Applied Sciences", False, [
        ("Agriculture (Crops, Livestock, Fisheries, Forestry, Natural Resources)", False),
        ("Food and Nutrition", False),
        ("Health and Medicine", False),
        ("Environment and Climate Change", False),
        ("Energy and Infrastructure", False),
    ]),
    ("2. Social & Community Development", False, [
        ("Countryside Development", False),
        ("Social Services (Welfare, housing, community programs)", False),
        ("Education (Curriculum, pedagogy, e-learning, inclusive education)", False),
        ("Disaster and Risk Reduction (Preparedness, resilience, recovery strategies)", False),
        ("Sports, Recreation & Wellness", False),
        ("Digital Transformation (E-governance, fintech, smart cities, digital inclusion)", True),
    ]),
    ("3. Governance, Economics & Policy", False, [
        ("Economics and Business (Sustainable SME entrepreneurship, trade, local economic models)", True),
        ("Governance and Policy (Public administration, law, peace and security, human rights)", False),
        ("Globalization & International Relations", False),
        ("Peace & Security Studies", False),
        ("Transportation", False),
    ]),
    ("4. Culture, Arts & Humanities", False, [
        ("Culture, Arts, and Humanities", False),
        ("Tourism and Hospitality", False),
    ]),
]

for cat, cat_checked, items in priority_areas:
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.2)
    r = p.add_run(cat)
    r.bold = True
    r.font.size = Pt(11)
    for item_text, item_checked in items:
        p2 = doc.add_paragraph()
        p2.paragraph_format.left_indent = Inches(0.5)
        mark = CHECKED if item_checked else UNCHECKED
        r2 = p2.add_run(f"{mark}  {item_text}")
        r2.font.size = Pt(11)

p = doc.add_paragraph()
p.paragraph_format.left_indent = Inches(0.2)
r = p.add_run("Other, please specify: " + "_" * 40)
r.font.size = Pt(11)

doc.add_paragraph()

# --- Software Domains ---
p = doc.add_paragraph()
r = p.add_run("Software and Emerging Technology Domains (Check the applicable):")
r.bold = True
r.font.size = Pt(11)

software_domains = [
    ("Data Analytics & Visualization (predictive dashboards, big data tools, business intelligence, real-time monitoring)", True),
    ("Cybersecurity Solutions (API authentication systems, secure communications, role-based access control, cryptographic integrity)", True),
    ("Cloud Computing Applications (SaaS platforms, cloud storage management, distributed systems, Data-as-a-Service engine)", True),
    ("Internet of Things (IoT) Systems (smart homes, sensor networks, agriculture IoT, industrial IoT)", False),
    ("Blockchain Applications (cryptocurrency wallets, supply chain tracking, smart contracts, decentralized apps)", False),
    ("Artificial Intelligence & Machine Learning (chatbots, recommendation engines, predictive models, natural language processing)", True),
    ("Augmented Reality (AR) / Virtual Reality (VR)", False),
    ("Software Customization (especially Free & Open Source Software – FOSS; localization, accessibility, usability enhancements)", False),
    ("Extensions (feature add-ons for browsers, IDEs, or platforms; workflow automation, productivity tools)", False),
    ("Plugins (modular enhancements for existing applications; multimedia plugins, analytics plugins)", False),
    ("Expert Systems and Decision Support Systems / Intelligent Systems (knowledge-based systems, AI-driven decision support, diagnostics)", True),
    ("Systems Software (utilities, interpreters, simulators, compilers, security-related software, performance monitoring)", False),
    ("Web Applications Development (e-commerce, portals, dashboards, online services, collaborative platforms)", True),
    ("Mobile Computing Systems (Android/iOS installable Progressive Web Apps, camera-based barcode scanning, local IndexedDB caching)", True),
    ("Computer Vision (image recognition, surveillance, medical imaging, gesture tracking, AR integration)", False),
    ("Game Development (educational games, serious games, entertainment platforms, gamified training)", False),
    ("E-learning Systems (LMS, gamified learning, adaptive learning platforms, AI tutors)", False),
    ("Interactive Systems (touch interfaces, gesture-based systems, VR/AR experiences, smart classrooms)", False),
    ("Information Kiosks (public service kiosks, tourism info systems, campus kiosks, healthcare kiosks)", False),
]

for domain_text, domain_checked in software_domains:
    p2 = doc.add_paragraph()
    p2.paragraph_format.left_indent = Inches(0.3)
    mark = CHECKED if domain_checked else UNCHECKED
    r2 = p2.add_run(f"{mark}  {domain_text}")
    r2.font.size = Pt(11)

doc.add_paragraph()

# --- Background Section ---
p = doc.add_paragraph()
r = p.add_run("Background")
r.bold = True
r.font.size = Pt(12)
p.paragraph_format.space_after = Pt(4)

bg_sections = [
    ("Technologies", 
     "The system is engineered as a decoupled Mobile Computing System utilizing a React.js (Vite) frontend configured as a fully installable Progressive Web App (PWA) using workbox service workers, local IndexedDB for secure off-line client database storage, and a separate security-hardened Node.js Express backend acting as a Data-as-a-Service (DaaS) engine. Central cloud synchronization is powered by Google Firestore. Security infrastructure includes JSON Web Tokens (JWT) for cashier/admin session authorization, encrypted HTTPS communication, Helmet security headers, and strict request rate-limiting. Barcode processing is handled client-side using html5-qrcode. The context-aware assistant utilizes the Google Gemini API, secure from direct client calls via backend proxy middleware."),
    ("Target Users & Multi-Business Adaptability", 
     "Unlike traditional single-store solutions, this system is designed to dynamically adapt to multiple business types (SMEs) such as Hardware Stores, Pharmacies, Grocery Stores, and General Retail boutiques. The primary users are store administrators and owners, who manage global business profiles, review cashier metrics, and query live stock patterns. Cashiers are secondary users who handle mobile checkout, offline receipt generation, and barcode scanning. Additionally, B2B stakeholders (suppliers and partners) act as consumers of the secured Data-as-a-Service API feed for stock monitoring and order coordination."),
    ("Existing Studies / Software", 
     "Commercial platforms like Lightspeed, Vend, or Shopify POS offer robust point-of-sale features but require constant high-speed internet, premium subscription fees, and lack tailored support for local Philippine SME requirements (such as senior citizen/PWD discounts and local supplier networks). Existing local capstone research often implements basic in-store PHP/MySQL databases without offline-first resilience, advanced mobile computing integration, or strict security protections. Furthermore, none of these systems introduce secured, programmatic Data-as-a-Service (DaaS) layers or closed-loop intelligent product acquisition features to capture unrecorded scanner failures."),
    ("Current Gap or Market Landscape", 
     "A significant gap exists in the market for lightweight, highly secure, and mobile computing-enabled sales and inventory architectures that can continue operating during power or network outages (which are common in rural Philippine provinces). SMEs struggle with manual bookkeeping, pricing errors, and lost sales from unregistered barcodes scanned at checkouts. This system bridges this gap by introducing a multi-business configurable PWA client with local database caching, a secure DaaS API middleware, and an intelligent recommendation engine that prompts cashiers to request product enrollment when scanned barcodes are not found in the local or remote catalog."),
]

for section_title, section_text in bg_sections:
    p_title = doc.add_paragraph()
    r_title = p_title.add_run(section_title)
    r_title.bold = True
    r_title.underline = True
    r_title.font.size = Pt(11)
    p_title.paragraph_format.left_indent = Inches(0.2)

    p_body = doc.add_paragraph()
    r_body = p_body.add_run(section_text)
    r_body.font.size = Pt(11)
    p_body.paragraph_format.left_indent = Inches(0.2)
    p_body.paragraph_format.space_after = Pt(8)

doc.add_paragraph()

# ========== TITLE TABLE ==========
title_table = doc.add_table(rows=1, cols=2)
title_table.style = 'Table Grid'
title_table.alignment = WD_TABLE_ALIGNMENT.CENTER

hdr = title_table.rows[0]
hdr.cells[0].width = Inches(1.8)
lp = hdr.cells[0].paragraphs[0]
lr = lp.add_run("Title of Study:")
lr.bold = True
lr.font.size = Pt(11)

cp = hdr.cells[1].paragraphs[0]
cr = cp.add_run("Design and Development of an API-Based, Security-Hardened Mobile Computing Sales and Inventory Management System with Data-as-a-Service (DaaS) Architecture and Intelligent Product Recommendation for Multi-Business SMEs")
cr.bold = True
cr.font.size = Pt(11)
cp.alignment = WD_ALIGN_PARAGRAPH.LEFT

doc.add_paragraph()

# ========== MAIN PROPOSAL TABLE ==========
table = doc.add_table(rows=0, cols=2)
table.style = 'Table Grid'
table.alignment = WD_TABLE_ALIGNMENT.CENTER

# ---- PROBLEM STATEMENT ----
row = table.add_row()
row.cells[0].merge(row.cells[1])
cell = row.cells[0]
set_cell_bg(cell, 'D9D9D9')
p = cell.paragraphs[0]
r = p.add_run("Problem Statement")
r.bold = True
r.font.size = Pt(11)

row2 = table.add_row()
row2.cells[0].merge(row2.cells[1])
cell2 = row2.cells[0]
problem_text = (
    "Small and Medium Enterprises (SMEs) such as hardware stores, local pharmacies, and retail shops "
    "face severe operational bottlenecks due to manual transaction tracking, slow checkout processes, "
    "and inaccurate inventory audits. Standard POS software is expensive, requires stable internet "
    "connectivity, and fails to handle diverse product properties (like steel bar dimensions vs. capsule "
    "mg dosages vs. clothing size variations). Additionally, manual bookkeeping leads to pricing discrepancies, "
    "unrecorded transactions, and delays in restocking. Security is also a major concern, as traditional "
    "SME systems rarely implement role-based access control (RBAC), secure session states, or strict compliance "
    "with the Data Privacy Act of 2012 (R.A. 10173), putting customer and sales data at risk. Furthermore, "
    "when cashiers scan new or unregistered items, checkout is delayed as records must be checked manually, "
    "with no mechanism in place to recommend stock acquisition or log catalog gaps.\n\n"
    "To address these challenges, this study proposes the development of a security-hardened, API-based "
    "Data-as-a-Service (DaaS) Mobile Computing Sales and Inventory Management System. By implementing a Progressive "
    "Web App client with a local product database (IndexedDB), cashiers can securely scan barcodes and process "
    "sales offline. The central Express API service acts as a secure data portal, utilizing token authentication "
    "and API rate-limiting to protect business resources. An intelligent barcode recommendation engine captures "
    "unregistered items at checkout, prompting cashiers to recommend product acquisition, which administrators "
    "can instantly review and enroll from their dashboard."
)
p2 = cell2.paragraphs[0]
p2.paragraph_format.space_after = Pt(6)
r2 = p2.add_run(problem_text)
r2.font.size = Pt(11)
cell2.paragraphs[0].paragraph_format.left_indent = Inches(0.2)

# ---- GENERAL OBJECTIVE ----
row = table.add_row()
row.cells[0].merge(row.cells[1])
cell = row.cells[0]
set_cell_bg(cell, 'D9D9D9')
p = cell.paragraphs[0]
r = p.add_run("General Objectives")
r.bold = True
r.font.size = Pt(11)

row2 = table.add_row()
row2.cells[0].merge(row2.cells[1])
cell2 = row2.cells[0]
p2 = cell2.paragraphs[0]
r2 = p2.add_run(
    "The primary objective of this study is to design and develop a security-hardened, API-based "
    "Data-as-a-Service (DaaS) Mobile Computing Sales and Inventory Management System. The platform "
    "provides installable offline POS operations, adaptive database schemas for multiple business profiles "
    "(SMEs), secure API gateway controls, and a closed-loop intelligent product acquisition recommendation "
    "feature to modernize retail workflows and protect transactional integrity."
)
r2.font.size = Pt(11)
p2.paragraph_format.left_indent = Inches(0.2)

# ---- SPECIFIC OBJECTIVES ----
row = table.add_row()
row.cells[0].merge(row.cells[1])
cell = row.cells[0]
set_cell_bg(cell, 'D9D9D9')
p = cell.paragraphs[0]
r = p.add_run("Specific Objectives")
r.bold = True
r.font.size = Pt(11)

row2 = table.add_row()
row2.cells[0].merge(row2.cells[1])
cell2 = row2.cells[0]

spec_objectives = [
    ("1. To develop a Mobile Computing client that adapts to multiple SME industries through:", True),
    ("    a. A responsive, glassmorphic Progressive Web App (PWA) installable on mobile terminal devices.", False),
    ("    b. Dynamic inventory forms capturing product images, sizes, capacities, and product variation grids.", False),
    ("    c. Full offline checkout capability utilizing local database persistence (IndexedDB).", False),
    ("2. To engineer a secure, centralized Data-as-a-Service (DaaS) Backend Engine featuring:", True),
    ("    a. JSON Web Token (JWT) authorization controls and role-based access control (RBAC) middleware.", False),
    ("    b. API Rate-limiting, CORS configuration, and Helmet security headers to prevent unauthorized intrusions.", False),
    ("    c. Scoped B2B API gateways allowing external stakeholders (suppliers) to safely query stock capacities.", False),
    ("3. To implement an Intelligent Product Acquisition Recommendation feature to:", True),
    ("    a. Detect unregistered barcode scan failures at POS cash registers in real time.", False),
    ("    b. Trigger cashier recommendation flows to request stock acquisition and pre-populate catalog gaps.", False),
    ("    c. Enable immediate administrative review, pricing, and active inventory enrollment.", False),
    ("4. To evaluate system acceptability and performance metrics through:", True),
    ("    a. Verification of transaction synchronization speed, offline data integrity, and security header compliance.", False),
    ("    b. User Acceptance Testing (UAT) following the ISO/IEC 25010 Software Quality standards.", False),
]
first = True
for text, bold in spec_objectives:
    if first:
        p = cell2.paragraphs[0]
        first = False
    else:
        p = cell2.add_paragraph()
    r = p.add_run(text)
    r.bold = bold
    r.font.size = Pt(11)
    p.paragraph_format.left_indent = Inches(0.2)
    p.paragraph_format.space_after = Pt(2)

# ---- BENEFICIARIES ----
row = table.add_row()
row.cells[0].merge(row.cells[1])
cell = row.cells[0]
set_cell_bg(cell, 'D9D9D9')
p = cell.paragraphs[0]
r = p.add_run("Beneficiaries")
r.bold = True
r.font.size = Pt(11)

row2 = table.add_row()
row2.cells[0].merge(row2.cells[1])
cell2 = row2.cells[0]
beneficiaries = [
    ("1. Multi-Business SME Retailers (Primary Clients)\n"
     "Modernizes administrative control by providing a central dashboard with clear metrics. Owners can switch business profiles dynamically (e.g. Hardware, Grocery, Pharmacy, clothing Retail) to instantly restructure data tables and inventory attributes. Fully secure from data loss due to offline-capable local storage synchronization.\n"
     "Involvement: Share inventory catalog data, participate in workflow mapping, and test terminal installation.", False),
    ("2. Cashiers and Retail Staff (End Users)\n"
     "Provides a light, rapid mobile POS terminal with a camera barcode scanner. No longer delayed by system failures, offline environments, or unregistered scanned barcodes, which can be submitted for stock acquisition with a single tap.\n"
     "Involvement: Participate in system usability reviews and terminal simulation testing.", False),
    ("3. Local Consumers & Customers\n"
     "Experience faster queue processing, accurate pricing variations, and solid data privacy protection (in compliance with national standards), preventing third-party snooping of transaction logs.\n"
     "Involvement: Indirectly validate POS checkout speeds during UAT.", False),
]
first = True
for text, bold in beneficiaries:
    if first:
        p = cell2.paragraphs[0]
        first = False
    else:
        p = cell2.add_paragraph()
    r = p.add_run(text)
    r.bold = bold
    r.font.size = Pt(11)
    p.paragraph_format.left_indent = Inches(0.2)
    p.paragraph_format.space_after = Pt(4)

# ---- SCOPE ----
row = table.add_row()
row.cells[0].merge(row.cells[1])
cell = row.cells[0]
set_cell_bg(cell, 'D9D9D9')
p = cell.paragraphs[0]
r = p.add_run("Scope")
r.bold = True
r.font.size = Pt(11)

row2 = table.add_row()
row2.cells[0].merge(row2.cells[1])
cell2 = row2.cells[0]
scope_items = [
    "Multi-Business Schema: The system supports four SME retail types (Hardware, Pharmacy, Grocery, and Boutique/Retail) via configurable local settings, dynamically altering database attributes, categories, and sizing lattices.",
    "Mobile Computing PWA: A service-worker-configured Progressive Web App that runs on Chrome, Safari, and Edge, supporting offline transaction queuing, auto-syncing, and native camera barcode scanning.",
    "Central DaaS API: A NodeJS backend acting as a secured B2B middleware database server, exposing RESTful endpoints for stock levels, catalogs, and transaction queries.",
    "Intelligent Recommendation Feature: Triggers cashier alert flows when a scanned barcode is unregistered, allowing immediate request submission to the admin dashboard for enrollment review.",
    "Security & RBAC: Strict token authentication (JWT) for cashiers/admins, custom API keys for DaaS feeds, bcrypt password cryptography, Helmet protection, and rate-limiting.",
    "Data Privacy Auditing: Ensures full compliance with the Philippine Data Privacy Act of 2012 by implementing secure session states, database access logs, and encrypted user credentials.",
]
first = True
for text in scope_items:
    if first:
        p = cell2.paragraphs[0]
        first = False
    else:
        p = cell2.add_paragraph()
    r = p.add_run(f"• {text}")
    r.font.size = Pt(11)
    p.paragraph_format.left_indent = Inches(0.2)
    p.paragraph_format.space_after = Pt(3)

# ---- LIMITATIONS ----
row = table.add_row()
row.cells[0].merge(row.cells[1])
cell = row.cells[0]
set_cell_bg(cell, 'D9D9D9')
p = cell.paragraphs[0]
r = p.add_run("Limitation")
r.bold = True
r.font.size = Pt(11)

row2 = table.add_row()
row2.cells[0].merge(row2.cells[1])
cell2 = row2.cells[0]
limitations = [
    "Database Separation: The system uses logical multi-tenant database indexing (a single Firestore instance partitioned by dynamic businessType identifiers) rather than dedicated physical cloud instances.",
    "API Key Revocation: Third-party DaaS integration credentials must be updated manually by the administrator in the server configuration file rather than through a automated key rotation pipeline.",
    "Hardware Dependent Scanning: The camera-based POS barcode scanner depends on the user device's camera specifications and lighting conditions, which may be slower than dedicated laser scanning hardware.",
    "Third-Party Generative AI: AI chatbot insights are generated via secure proxy to the Gemini API and are subject to third-party availability and API rate limits.",
]
first = True
for i, text in enumerate(limitations, 1):
    if first:
        p = cell2.paragraphs[0]
        first = False
    else:
        p = cell2.add_paragraph()
    r = p.add_run(f"{i}. {text}")
    r.font.size = Pt(11)
    p.paragraph_format.left_indent = Inches(0.2)
    p.paragraph_format.space_after = Pt(3)

# ---- METHODOLOGY & ARCHITECTURE ----
row = table.add_row()
row.cells[0].merge(row.cells[1])
cell = row.cells[0]
set_cell_bg(cell, 'D9D9D9')
p = cell.paragraphs[0]
r = p.add_run("Materials, Methods, and System Design")
r.bold = True
r.font.size = Pt(11)

row2 = table.add_row()
row2.cells[0].merge(row2.cells[1])
cell2 = row2.cells[0]

method_details = [
    "1. API-Based Data-as-a-Service (DaaS) Architecture:\n"
    "   The core of the system is a centralized Express.js backend acting as a secured middleware gateway. This engine decouples business logic from client interfaces. It communicates with a local product database (seeded with hardware, pharmacy, and grocery segments) and provides JSON feeds to external client systems (like third-party ERPs or supplier hubs) using scoped B2B API keys. This ensures extreme scalability and database efficiency.",
    
    "2. Local Database & Off-line Mobile Computing Sync:\n"
    "   Each installable PWA terminal runs a client-side IndexedDB store. This local database mirrors the central product catalog including images, size structures, and variations. When a cashier scans an item, the PWA queries the local database first (0ms latency, works completely offline). Transactions are queued locally and automatically synchronized with the central cloud database using background sync handlers when connection is restored.",
    
    "3. Security Hardening & Data Privacy Compliance:\n"
    "   To fully comply with the Data Privacy Act of 2012 (R.A. 10173) and GDPR, the system contains multiple security layers: (a) Cryptographic Hashing: User passwords are encrypted on the server using bcrypt; (b) JWT Security: Casher/admin logins issue cryptographically signed tokens stored in memory, preventing session hijacking; (c) Transport Protection: E2E TLS/HTTPS hides traffic; (d) Server Hardening: Helmet secure headers, CORS constraints, and Express rate-limiters prevent DDoS and query scraping.",
    
    "4. Intelligent Product Acquisition & Scan Flow:\n"
    "   • Step 1: Cashier scans product barcode via PWA camera.\n"
    "   • Step 2: Client searches local IndexedDB -> if hit, item adds to cart.\n"
    "   • Step 3: If local miss, queries DaaS API -> if 404, triggers the Intelligent recommendation engine.\n"
    "   • Step 4: PWA displays a modal prompting the cashier to request product enrollment.\n"
    "   • Step 5: Recommendation is saved as a 'pending' record with barcode and business type.\n"
    "   • Step 6: Admin dashboard displays an alert. Admin reviews, prices, sets category, and approves, promoting the item to active stock in a single tap.",
]

first = True
for text in method_details:
    if first:
        p = cell2.paragraphs[0]
        first = False
    else:
        p = cell2.add_paragraph()
    r = p.add_run(text)
    r.font.size = Pt(11)
    p.paragraph_format.left_indent = Inches(0.2)
    p.paragraph_format.space_after = Pt(4)

# ---- BUSINESS MODEL / BUSINESS PLAN ----
row = table.add_row()
row.cells[0].merge(row.cells[1])
cell = row.cells[0]
set_cell_bg(cell, 'D9D9D9')
p = cell.paragraphs[0]
r = p.add_run("SME Sustainability and Business Plan")
r.bold = True
r.font.size = Pt(11)

row2 = table.add_row()
row2.cells[0].merge(row2.cells[1])
cell2 = row2.cells[0]
business_items = [
    "DaaS Subscription Pricing: We offer three subscription tiers: (a) Starter: ₱1,500/month for 1 terminal with standard inventory tracking; (b) Professional: ₱3,500/month for up to 5 terminals and offline PWA sync; (c) Enterprise DaaS: ₱6,000/month providing open B2B API gateways for external supplier connections.",
    "Hardware Integration Bundles: We partner with budget tablet providers and Bluetooth barcode scanner manufacturers to offer a low-cost, plug-and-play mobile computing hardware starter bundle for ₱15,000 (one-time fee).",
    "Onboarding and Training Services: A dedicated onboarding service (₱3,500) covering one-day on-site cashier training, business profile configuration (Hardware, Grocery, or Pharmacy), and database migration templates.",
    "Sustainability: Local IndexedDB caching reduces active cloud reads/writes, ensuring the system operates within free Spark plan tiers for Firebase, promoting cost-efficiency and technical sustainability for Philippine SMEs.",
]
first = True
for text in business_items:
    if first:
        p = cell2.paragraphs[0]
        first = False
    else:
        p = cell2.add_paragraph()
    r = p.add_run(f"• {text}")
    r.font.size = Pt(11)
    p.paragraph_format.left_indent = Inches(0.2)
    p.paragraph_format.space_after = Pt(3)

# ---- PERSONALIZED DEMONSTRATION TEMPLATE ----
row = table.add_row()
row.cells[0].merge(row.cells[1])
cell = row.cells[0]
set_cell_bg(cell, 'D9D9D9')
p = cell.paragraphs[0]
r = p.add_run("Personalized Demonstration & Validation Template")
r.bold = True
r.font.size = Pt(11)

row2 = table.add_row()
row2.cells[0].merge(row2.cells[1])
cell2 = row2.cells[0]
demo_text = (
    "To demonstrate how the system successfully achieves its design goals, the proponents will utilize "
    "the following test scenarios during evaluation:\n\n"
    "Scenario A: Off-line Cashier Checkout & Local DB Query\n"
    "1. The evaluator disconnects the cashier tablet terminal from the internet.\n"
    "2. The cashier scans a registered barcoded item (e.g. Paracetamol 500mg tablet).\n"
    "3. The system instantly queries the local IndexedDB, finds the product, sizes/dosages, and adds it to the cart.\n"
    "4. The cashier completes checkout; a receipt is generated, and the sale is securely queued in IndexedDB.\n\n"
    "Scenario B: DaaS Sync & Stock Deductions\n"
    "1. The evaluator restores internet connectivity to the cashier terminal.\n"
    "2. The background sync workers trigger, pushing the queued sale to the DaaS Express engine.\n"
    "3. The API validates credentials, uploads records to Firestore, and decrements stock from 500 to 499.\n"
    "4. The Admin dashboard updates in real time to show the updated stock levels.\n\n"
    "Scenario C: Intelligent Product Acquisition Flow\n"
    "1. The cashier scans an unregistered barcode (e.g., '4800016552109' on a new grocery item).\n"
    "2. The system triggers the Intelligent recommendation alert. Cashier enters 'Silver Swan Soy Sauce 1L' and submits.\n"
    "3. The DaaS API logs a pending acquisition request.\n"
    "4. The Admin logs in, clicks the 'Review Requests' banner, clicks 'Enroll', sets a price of ₱45.00, and saves.\n"
    "5. The soy sauce is instantly added to active stock, and the cashier terminal auto-syncs the new catalog item."
)
p_demo = cell2.paragraphs[0]
r_demo = p_demo.add_run(demo_text)
r_demo.font.size = Pt(11)
cell2.paragraphs[0].paragraph_format.left_indent = Inches(0.2)

# ---- TIMELINE ----
row = table.add_row()
row.cells[0].merge(row.cells[1])
cell = row.cells[0]
set_cell_bg(cell, 'D9D9D9')
p = cell.paragraphs[0]
r = p.add_run("Timeline of Activities")
r.bold = True
r.font.size = Pt(11)

row2 = table.add_row()
row2.cells[0].merge(row2.cells[1])
cell2 = row2.cells[0]
p2 = cell2.paragraphs[0]
r2 = p2.add_run("Iterative Agile Development Timeline:")
r2.italic = True
r2.font.size = Pt(11)
p2.paragraph_format.left_indent = Inches(0.3)
p2.paragraph_format.space_after = Pt(4)

gantt_data = [
    ("Requirements & Multi-Business Schema Mapping",    [1]),
    ("API DaaS Engine & Database Setup",                [1, 2]),
    ("UI/UX Prototyping & Security Hardening",          [2]),
    ("Development - JWT / API Authorization",            [2, 3]),
    ("Development - Offline PWA POS Terminal",          [3]),
    ("Development - Inventory & Intelligent Scanner",    [3, 4]),
    ("Development - AI Proxy & Data Feeds",             [4]),
    ("Offline Sync Integration & Testing",              [5]),
    ("Security & Compliance Vulnerability Auditing",    [5]),
    ("User Acceptance Testing (UAT) - ISO 25010",       [6]),
    ("Final SME Deployment & Documentation",            [6]),
]

gantt_table = cell2.add_table(rows=1 + len(gantt_data), cols=7)
gantt_table.style = 'Table Grid'

headers = ["Activity", "Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6"]
hdr_row = gantt_table.rows[0]
for i, h in enumerate(headers):
    cell_h = hdr_row.cells[i]
    set_cell_bg(cell_h, 'BDD7EE')
    p_h = cell_h.paragraphs[0]
    p_h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_h = p_h.add_run(h)
    r_h.bold = True
    r_h.font.size = Pt(10)

for row_idx, (activity, active_months) in enumerate(gantt_data):
    data_row = gantt_table.rows[row_idx + 1]
    act_cell = data_row.cells[0]
    p_a = act_cell.paragraphs[0]
    r_a = p_a.add_run(activity)
    r_a.font.size = Pt(10)
    for col_idx in range(1, 7):
        month_num = col_idx
        m_cell = data_row.cells[col_idx]
        p_m = m_cell.paragraphs[0]
        p_m.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if month_num in active_months:
            set_cell_bg(m_cell, 'D9D9D9')
            r_m = p_m.add_run("   ")
            r_m.font.size = Pt(10)

# ---- Save ----
output_path = r"C:\ASM\Research_Proposal_v2.docx"
doc.save(output_path)
print(f"SUCCESS - Revised Word document created at: {output_path}")
