// Seed 200 consultant profiles into Firestore for the explore page.
// Run: node scripts/seed-consultants.mjs
//
// Idempotent — skips users/profiles whose UID already exists.
// Reads creds from FIREBASE_* env vars (do NOT use the committed JSON key).

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import admin from "firebase-admin";

export { loadEnvLocal, NAMESPACE, STORE_PATH, makeProfile, makeUserDoc, TOTAL, scopedCollection, GENDERS, SEXUAL_ORIENTATIONS, BODY_BUILDS, LOCATION_COUNTRY, LOCATION_STATE, pick };

const __dirname = dirname(fileURLToPath(import.meta.url));

// ponytail: load .env.local without adding dotenv as a dep — Node 20.6+ has --env-file
// but we keep it simple: parse the file ourselves, no new deps.
function loadEnvLocal() {
  const envPath = resolve(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}
loadEnvLocal();

const NAMESPACE = (process.env.FIREBASE_NAMESPACE || "sociallink").replace(/^\/+|\/+$/g, "");
const SHARED_PASSWORD = "DemoPassword123!"; // demo only — never log this
const TOTAL = 200;

const STORE_PATH = ["stores", NAMESPACE];

// Admin SDK collection() takes a single path string — varargs silently resolve
// to just the first segment (db.collection("stores","sociallink") == stores),
// which is the bug that stranded seed docs at stores/{uid}.
function scopedCollection(db, ...segments) {
  return db.collection([...STORE_PATH, ...segments].join("/"));
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();
const auth = admin.auth();

// ─── Data ───────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Adaeze","Chidinma","Oluwaseun","Tunde","Bukola","Ngozi","Funmilayo","Yemisi","Aisha",
  "Chiamaka","Ifeanyi","Emeka","Obinna","Kelechi","Adaugo","Zainab","Halima","Yetunde",
  "Olusegun","Babatunde","Adetola","Ayomide","Folake","Chizoba","Chisom","Kosisochukwu",
  "Ibrahim","Sadiq","Bilkisu","Nnamdi","Chinedu","Azuka","Obiageli","Uchenna","Amara",
  "Wasiu","Lateef","Adekunle","Adedayo","Olamide","Tiwa","Teni","Simi","Blaqbonez",
  "Fireboy","Wizkid","Davido","Burna","Tems","Rema","Asake","Fave","Ayra",
  "Nairobi","Kwame","Kofi","Ama","Akua","Yaa","Esi","Kojo","Kobina",
  "Wanjiru","Atieno","Akinyi","Nyambura","Mwangi","Kamau","Kariuki","Njoroge",
  "Thabo","Sipho","Lerato","Naledi","Mandla","Bongani","Zanele","Palesa","Mpho",
];
const LAST_NAMES = [
  "Okonkwo","Adebayo","Ogunleye","Bakare","Achebe","Soyinka","Akinwale","Olawale","Okeke",
  "Eze","Nnamdi","Okoro","Onyebuchi","Onyeama","Obi","Ojukwu","Mba","Onuoha",
  "Mohammed","Bello","Suleiman","Abubakar","Aminu","Sadiq","Yusuf","Ibrahim","Lawal",
  "Ojo","Adeyemi","Adesanya","Afolabi","Olatunji","Ogedengbe","Oshodi","Salu","Pedro",
  "Mwangi","Kamau","Njoroge","Wairimu","Wambui","Achieng","Atieno","Otieno","Ouma",
  "Mensah","Asante","Owusu","Boateng","Agyapong","Acheampong","Darko","Appiah","Aidoo",
  "Mokoena","Dlamini","Khumalo","Ndlovu","Sithole","Mahlangu","Mabaso","Zulu","Buthelezi",
];
const LOCATIONS = [
  { label: "Lagos",          lat: 6.5244, lng: 3.3792, weight: 50 },
  { label: "Abuja",          lat: 9.0765, lng: 7.3986, weight: 30 },
  { label: "Port Harcourt",  lat: 4.8156, lng: 7.0498, weight: 20 },
  { label: "Ibadan",         lat: 7.3775, lng: 3.9470, weight: 20 },
  { label: "Benin City",     lat: 6.3350, lng: 5.6037, weight: 15 },
  { label: "Nairobi",        lat: -1.2864, lng: 36.8172, weight: 25 },
  { label: "Accra",          lat: 5.6037, lng: -0.1870, weight: 20 },
  { label: "Cape Town",      lat: -33.9249, lng: 18.4241, weight: 20 },
];
const THEMES = [
  "Cultural Guide",
  "Business Networking",
  "Event Attendance",
  "Dining Companion",
  "Travel Partner",
  "Lifestyle Coaching",
  "Language Exchange",
  "Fitness Partner",
];

const SERVICE_TEMPLATES = {
  "Cultural Guide": [
    { title: "Lagos Cultural Tour", description: "Curated tour of Lagos art, music, and food scenes.", price: 45000 },
    { title: "Yoruba Heritage Walk", description: "Guided exploration of Yoruba history and traditions.", price: 38000 },
    { title: "Museum & Gallery Visit", description: "Companion for a relaxed afternoon at the museum.", price: 25000 },
  ],
  "Business Networking": [
    { title: "Conference Companion", description: "Attend industry events together and make introductions.", price: 75000 },
    { title: "Investor Pitch Practice", description: "Rehearse your pitch with a seasoned sounding board.", price: 60000 },
    { title: "Networking Dinner", description: "Strategic dinner companion for key introductions.", price: 90000 },
  ],
  "Event Attendance": [
    { title: "Wedding Plus-One", description: "Polished plus-one for weddings and celebrations.", price: 55000 },
    { title: "Award Ceremony Companion", description: "Confidant for galas and award nights.", price: 70000 },
    { title: "Birthday Party Attendance", description: "Warm companion for personal celebrations.", price: 35000 },
  ],
  "Dining Companion": [
    { title: "Fine Dining Companion", description: "Refined dining companion for upscale restaurants.", price: 40000 },
    { title: "Brunch Date", description: "Relaxed weekend brunch companion.", price: 22000 },
    { title: "Food Tasting Tour", description: "Guided tasting across the city's best kitchens.", price: 50000 },
  ],
  "Travel Partner": [
    { title: "Weekend Getaway", description: "Travel companion for short domestic trips.", price: 120000 },
    { title: "International Travel", description: "Experienced companion for international travel.", price: 250000 },
    { title: "City Exploration", description: "Local guide for discovering a new city together.", price: 65000 },
  ],
  "Lifestyle Coaching": [
    { title: "Personal Styling Session", description: "Wardrobe refresh and style coaching.", price: 55000 },
    { title: "Wellness Coaching", description: "Holistic wellness and routine design.", price: 48000 },
    { title: "Career Strategy Hour", description: "One-hour career planning session.", price: 35000 },
  ],
  "Language Exchange": [
    { title: "Yoruba Lessons", description: "Conversational Yoruba lessons for beginners.", price: 20000 },
    { title: "Igbo Language Hour", description: "Igbo conversation and pronunciation practice.", price: 20000 },
    { title: "Hausa Conversation", description: "Practical Hausa for travel and business.", price: 18000 },
    { title: "Swahili Basics", description: "East African Swahili for travellers.", price: 22000 },
  ],
  "Fitness Partner": [
    { title: "Gym Buddy Session", description: "Motivating gym companion for an hour.", price: 25000 },
    { title: "Morning Run Partner", description: "Daily run companion across Lagos.", price: 15000 },
    { title: "Yoga & Stretching", description: "Gentle yoga or stretch session.", price: 30000 },
  ],
};

const BIOS = [
  "Curator of experiences, professional and warm.",
  "Connector at heart — let's build something memorable.",
  "Lifelong learner with a passion for people and culture.",
  "Polished, reliable, and easy to be around.",
  "I love great conversation, good food, and sharp ideas.",
  "Bringing calm, class, and curiosity to every engagement.",
  "Diaspora professional happy to host you in my city.",
  "Storyteller, foodie, and seasoned plus-one.",
  "Strategy by day, culture by night.",
  "Quiet confidence, sharp listening, dependable energy.",
];

const GENDERS = ["Male", "Female", "Non-binary", "Other"];
const SEXUAL_ORIENTATIONS = ["Straight", "Gay", "Bisexual", "Pansexual", "Prefer not to say"];
const BODY_BUILDS = ["Athletic", "Average", "Slim", "Curvy", "Muscular", "Fit"];
const SMOKING_RATE = 0.15;

const LOCATION_COUNTRY = {
  Lagos: "Nigeria",
  Abuja: "Nigeria",
  "Port Harcourt": "Nigeria",
  Ibadan: "Nigeria",
  "Benin City": "Nigeria",
  Nairobi: "Kenya",
  Accra: "Ghana",
  "Cape Town": "South Africa",
};
const LOCATION_STATE = {
  Lagos: "Lagos",
  Abuja: "Federal Capital Territory",
  "Port Harcourt": "Rivers",
  Ibadan: "Oyo",
  "Benin City": "Edo",
  Nairobi: "Nairobi County",
  Accra: "Greater Accra",
  "Cape Town": "Western Cape",
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickWeighted(items) {
  const total = items.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const it of items) { if ((r -= it.weight) < 0) return it; }
  return items[items.length - 1];
}
function jitter(value, spread = 0.05) {
  return value + (Math.random() - 0.5) * spread;
}
function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28);
}

function makeProfile(i, override = {}) {
  const first = override.first ?? pick(FIRST_NAMES);
  const last = override.last ?? pick(LAST_NAMES);
  const displayName = override.displayName ?? `${first} ${last}`;
  const uid = override.uid ?? `${slug(displayName)}-${i}`;
  const location = pickWeighted(LOCATIONS);
  const themeCount = 1 + Math.floor(Math.random() * 3); // 1–3
  const themes = [];
  const pool = [...THEMES];
  while (themes.length < themeCount && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    themes.push(pool.splice(idx, 1)[0]);
  }
  const services = themes.map((t) => {
    const tmpl = pick(SERVICE_TEMPLATES[t]);
    return {
      id: `${uid}-${slug(tmpl.title)}`,
      title: tmpl.title,
      description: tmpl.description,
      price: tmpl.price,
    };
  });
  const retainer = services[0]?.price ?? 30000;
  const createdAt = admin.firestore.Timestamp.now();
  const avatarSeed = encodeURIComponent(displayName + i);
  return {
    uid,
    displayName,
    gender: pick(GENDERS),
    sexualOrientation: pick(SEXUAL_ORIENTATIONS),
    bodyBuild: pick(BODY_BUILDS),
    smoking: Math.random() < SMOKING_RATE,
    city: location.label,
    state: LOCATION_STATE[location.label],
    country: LOCATION_COUNTRY[location.label],
    bio: pick(BIOS),
    services,
    retainer,
    themes,
    location: new admin.firestore.GeoPoint(jitter(location.lat, 0.08), jitter(location.lng, 0.08)),
    locationLabel: location.label,
    isOnline: Math.random() < 0.4,
    averageRating: Number((4.2 + Math.random() * 0.7).toFixed(1)),
    totalReviews: 5 + Math.floor(Math.random() * 115),
    avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${avatarSeed}`,
    blurAvatar: false,
    createdAt,
    updatedAt: createdAt,
  };
}

function makeUserDoc(uid, displayName, phone) {
  const now = admin.firestore.Timestamp.now();
  return {
    uid,
    phoneNumber: phone,
    role: "CONSULTANT",
    email: `${slug(displayName)}-${uid.slice(-4)}@demo.sociallink.ng`,
    banned: false,
    wallet: { availableBalance: 50000, escrowBalance: 0 },
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function existingUidSet() {
  const set = new Set();
  const snap = await scopedCollection(db, "profiles").select("uid").get();
  snap.forEach((d) => set.add(d.id));
  return set;
}

async function run() {
  console.log(`[seed] namespace=${NAMESPACE}, target=${TOTAL}`);
  const existing = await existingUidSet();
  console.log(`[seed] existing profiles in store: ${existing.size}`);

  let created = 0;
  let skipped = 0;
  let errored = 0;
  const batchSize = 500;
  let batch = db.batch();
  let pending = 0;
  const examples = [];

  async function flush() {
    if (!pending) return;
    await batch.commit();
    batch = db.batch();
    pending = 0;
  }

  for (let i = 0; i < TOTAL; i++) {
    const profile = makeProfile(i);
    if (existing.has(profile.uid)) { skipped++; continue; }

    const phone = `+23480${String(10000000 + i).slice(-8)}`;
    const userDoc = makeUserDoc(profile.uid, profile.displayName, phone);
    const email = userDoc.email;

    try {
      // Auth user — create if missing, but always write profile/user docs.
      // (Idempotent rerun: auth may already exist while docs are missing.)
      try {
        await auth.createUser({
          uid: profile.uid,
          email,
          password: SHARED_PASSWORD,
          phoneNumber: phone,
          displayName: profile.displayName,
          emailVerified: true,
        });
      } catch (e) {
        const code = e?.code;
        const isAlready = code === "auth/email-already-exists"
          || code === "auth/uid-already-exists"
          || code === "auth/phone-number-already-exists";
        if (!isAlready) throw e;
      }

      const profileRef = scopedCollection(db, "profiles").doc(profile.uid);
      const userRef = scopedCollection(db, "users").doc(profile.uid);
      batch.set(profileRef, profile);
      batch.set(userRef, userDoc);
      pending += 2;
      created++;
      if (examples.length < 3) examples.push({ displayName: profile.displayName, themes: profile.themes, services: profile.services, retainer: profile.retainer });

      if (pending >= batchSize) await flush();
    } catch (e) {
      console.error(`[seed] failed ${profile.displayName}:`, e?.message || e);
      errored++;
    }
  }
  await flush();

  console.log(`[seed] done — created: ${created}, skipped: ${skipped}, errored: ${errored}`);
  console.log(`[seed] examples:`);
  for (const ex of examples) console.log(JSON.stringify(ex, null, 2));
  console.log(`[seed] demo password (do not log in production): DemoPassword***`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  run().catch((e) => { console.error("[seed] fatal:", e); process.exit(1); });
}
