// js/firestoreOperations.js
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  doc,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { db } from "./firebaseConfig.js";

// ============= TASK COLLECTION =============
const tasksCollection = collection(db, "tasks");

// ✅ Listen for real-time updates
export function listenForTasks(callback) {
  const q = query(tasksCollection, orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(tasks);
  });
}

// ✅ Add new task
export async function addTaskToFirestore(taskData) {
  return await addDoc(tasksCollection, {
    ...taskData,
    createdAt: serverTimestamp(),
  });
}

// ✅ Update task
export async function updateTaskInFirestore(taskId, updatedData) {
  const taskRef = doc(db, "tasks", taskId);
  return await updateDoc(taskRef, updatedData);
}

// ✅ Delete task
export async function deleteTaskFromFirestore(taskId) {
  const taskRef = doc(db, "tasks", taskId);
  return await deleteDoc(taskRef);
}

// ✅ Get a specific task by ID
export async function getTaskById(taskId) {
  const taskRef = doc(db, "tasks", taskId);
  const taskSnap = await getDoc(taskRef);
  if (taskSnap.exists()) {
    return { id: taskSnap.id, ...taskSnap.data() };
  } else {
    console.log("No such task!");
    return null;
  }
}

// ✅ Get tasks with a specific order (used for CSV export)
export function getTasksQuery(field, direction) {
  return query(tasksCollection, orderBy(field, direction));
}

// ✅ NEW: Count active tasks for a specific user
export async function countUserActiveTasks(resourceName) {
  const q = query(
    tasksCollection,
    where("resource", "==", resourceName),
    where("status", "!=", "completed") // Only count non-completed tasks
  );
  const snapshot = await getDocs(q);
  return snapshot.size; // Return the number of documents found
}

// ============= APP VERSION COLLECTION =============
const appVersionCollection = collection(db, "appVersion");

// ✅ Get app version - SIMPLIFIED TO DIRECTLY FETCH 'latest' DOC
export async function getAppVersion() {
  try {
    // Assuming a single 'latest' document for version is fetched by its ID
    const snap = await getDoc(doc(appVersionCollection, "latest"));
    if (snap.exists()) {
      return snap.data().version;
    }
    return null;
  } catch (error) {
    console.error("Error fetching app version:", error);
    return null;
  }
}
