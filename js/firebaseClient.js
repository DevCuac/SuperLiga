// js/firebaseClient.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  signInAnonymously, signOut, updateProfile,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp,
  collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";

// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCQLPHpuorAMn-RRVjW1YftqDbrMDTIDOc",
  authDomain: "argentumhard-b6363.firebaseapp.com",
  projectId: "argentumhard-b6363",
  storageBucket: "argentumhard-b6363.appspot.com",
  messagingSenderId: "748856282633",
  appId: "1:748856282633:web:14f1136c353418b978b2d8",
  measurementId: "G-XCEKQYQ5GC"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const storage = getStorage(app);

// Helpers
getRedirectResult(auth).catch(()=>{});

async function signInWithProvider(provider){
  try{ return await signInWithPopup(auth, provider); }
  catch(e){
    if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/cancelled-popup-request'){
      await signInWithRedirect(auth, provider);
      return;
    }
    throw e;
  }
}

// API
function onAuth(cb){ return onAuthStateChanged(auth, cb); }
async function signOutUser(){ return signOut(auth); }
async function signInGoogle(){ return signInWithProvider(new GoogleAuthProvider()); }
async function signInAnon(){ return signInAnonymously(auth); }

async function emailRegister(email, pass){
  const { user } = await createUserWithEmailAndPassword(auth, email, pass);
  return user;
}
async function emailLogin(email, pass){
  const { user } = await signInWithEmailAndPassword(auth, email, pass);
  return user;
}
async function emailReset(email){ return sendPasswordResetEmail(auth, email); }

async function saveUserProfile(uid, displayName, photoURL){
  if(!uid) return;
  await setDoc(doc(db,'users',uid), {
    displayName, photoURL, updatedAt: serverTimestamp()
  }, { merge:true });
  try{ if(auth.currentUser) await updateProfile(auth.currentUser,{ displayName, photoURL }); }catch(_){}
}

async function uploadProfilePic(uid, file){
  const storageRef = ref(storage, `avatars/${uid}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

async function saveSubmission(uid, payload){
  if(!uid) return;
  await setDoc(doc(db,'submissions',uid), {
    user: payload.user || 'anon',
    picks: payload.picks || {},
    updatedAt: serverTimestamp()
  }, { merge:true });
}
async function fetchSubmissions(){
  const snap = await getDocs(collection(db,'submissions'));
  const rows = [];
  snap.forEach(d => rows.push({ uid:d.id, ...(d.data()||{}) }));
  return rows;
}
async function getDisplayName(uid){
  let name = auth.currentUser?.displayName || '';
  try{
    const s = await getDoc(doc(db,'users',uid));
    if (s.exists() && s.data()?.displayName) name = s.data().displayName;
  }catch(_){}
  return name;
}

// Exponer
window.fb = {
  auth, db, onAuth, signOutUser, signInGoogle, signInAnon,
  emailRegister, emailLogin, emailReset,
  saveUserProfile, uploadProfilePic,
  saveSubmission, fetchSubmissions, getDisplayName
};
