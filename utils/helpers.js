const { compact } = require("lodash");
const {
  db,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
} = require("../firebase");
const { DB_COLLECTIONS } = require("../utils/constants");
const { includes, union, map } = require("lodash");
const { storage, ref, uploadBytes, getDownloadURL } = require("../firebase");
const crypto = require("crypto");

const generateUUID = () => crypto.randomUUID();

const storeDataInDatabase = async (data, collectionName, documentId) => {
  try {
    await setDoc(doc(db, collectionName, documentId), data);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const deleteDocFromDatabase = async (collectionName, documentId) => {
  try {
    await deleteDoc(doc(db, collectionName, documentId)); // Delete the document from the specified collection
    console.log(`Document with ID ${documentId} deleted successfully`);
    return true;
  } catch (error) {
    console.error("Error deleting document:", error); // Log the error if deletion fails
    return false;
  }
};

const getDataFromDatabase = async (
  collectionName,
  documentId,
  filters = null
) => {
  try {
    if (filters === null) {
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        return null;
      }
    } else {
      const collectionRef = collection(db, collectionName);

      // Apply multiple filters if provided
      let queryRef = collectionRef;
      filters.forEach((filter) => {
        queryRef = query(queryRef, where(...filter));
      });

      const querySnapshot = await getDocs(queryRef);

      if (!querySnapshot.empty) {
        return querySnapshot.docs.map((doc) => doc.data());
      } else {
        return null;
      }
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getAllDocumentsFromCollection = async (collectionName) => {
  try {
    const collectionRef = collection(db, collectionName);
    const querySnapshot = await getDocs(collectionRef);
    const documents = [];

    querySnapshot.forEach((doc) => {
      documents.push(doc.data()); // Only include document data
    });

    return documents;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const countDocumentsInCollection = async (collectionName) => {
  try {
    const collectionRef = collection(db, collectionName);
    const querySnapshot = await getDocs(collectionRef);
    const documentCount = querySnapshot.size;
    return documentCount;
  } catch (error) {
    console.error(error);
    return 0;
  }
};

const findOrCreateChat = async (senderId, receiverId) => {
  // Find chat document by participants
  const chatData = await getDataFromDatabase(DB_COLLECTIONS.chats, "", [
    ["participants", "array-contains-any", [senderId, receiverId]],
  ]);

  if (!chatData) {
    // If no chat exists, create a new chat
    const newChat = {
      id: generateUUID(),
      participants: [senderId, receiverId],
      createdAt: new Date().toISOString(), // Use ISO string for timestamps
    };
    const success = await storeDataInDatabase(
      newChat,
      DB_COLLECTIONS.chats,
      newChat.id
    );

    if (!success) {
      throw new Error("Error in initiating chat");
    }

    return newChat.id;
  } else {
    return chatData[0]?.id;
  }
};

const storeMessage = async ({ text, time, seen, senderId, chatId }) => {
  const msgId = generateUUID();
  const message = {
    msgId,
    text,
    time,
    seen,
    senderId,
    chatId,
  };
  return await storeDataInDatabase(message, DB_COLLECTIONS.messages, msgId);
};

const getLikedMeProfiles = async (id) => {
  const favoritesDocs = await getAllDocumentsFromCollection(
    DB_COLLECTIONS.favorites
  );
  const likedMeList = await Promise.all(
    favoritesDocs.map(async (doc) => {
      if (includes(doc?.favoriteUsers, id)) {
        const userProfile = await getDataFromDatabase(
          DB_COLLECTIONS.users,
          doc?.user
        );
        return userProfile;
      }
    })
  );
  return compact(likedMeList);
};

const getBlockedProfileIds = async (id) => {
  // Fetch users blocked by me
  const data = await getDataFromDatabase(DB_COLLECTIONS.blockLists, id);
  const blockedByMeList = data?.blockedUsers || [];

  // Fetch users who blocked me
  const blockedDocs = await getAllDocumentsFromCollection(
    DB_COLLECTIONS.blockLists
  );

  let blockedMeList = await Promise.all(
    blockedDocs.map(async (doc) => {
      if (includes(doc?.blockedUsers, id)) {
        const userProfile = await getDataFromDatabase(
          DB_COLLECTIONS.users,
          doc?.user
        );
        return userProfile?.id;
      }
    })
  );
  blockedMeList = compact(blockedMeList);

  let deletedAccounts = await getAllDocumentsFromCollection(
    DB_COLLECTIONS.deletedAccounts
  );
  deletedAccounts = map(deletedAccounts, (acc) => acc?.user || "");

  // Merge both lists without duplicates
  const mergedBlockedList = union(
    blockedByMeList,
    blockedMeList,
    deletedAccounts
  );

  return mergedBlockedList;
};

const uploadImageInBucket = async (uri) => {
  try {
    if (!uri) {
      console.error("No URI provided for upload");
      return "";
    }

    // Use fetch to get the image file
    const response = await fetch(uri);

    // Check if the response is valid
    if (!response.ok) {
      console.error("Failed to fetch image, status code:", response.status);
      return "";
    }

    // Get the blob from the response
    const blob = await response.blob();

    const imageName = `images/${new Date().getTime()}-photo.jpg`;
    const storageRef = ref(storage, imageName);

    // Upload the blob to Firebase Storage
    const snapshot = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log("Upload successful, download URL:", downloadURL);
    return downloadURL;
  } catch (e) {
    console.error("Error uploading image:", e);
    if (e.response) {
      console.error("Server Response:", e.response.data);
    }
    return "";
  }
};

const getFormattedDateTime = () => {
  const now = new Date();
  // Get date components
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are zero-based
  const year = now.getFullYear();
  // Get time components
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  // Format date and time
  const formattedDate = `${day}/${month}/${year}`;
  const formattedTime = `${hours}:${minutes}:${seconds}`;

  return `${formattedDate} ${formattedTime}`;
};

module.exports = {
  storeDataInDatabase,
  getDataFromDatabase,
  getAllDocumentsFromCollection,
  findOrCreateChat,
  storeMessage,
  getLikedMeProfiles,
  countDocumentsInCollection,
  getBlockedProfileIds,
  uploadImageInBucket,
  getFormattedDateTime,
  deleteDocFromDatabase,
};
