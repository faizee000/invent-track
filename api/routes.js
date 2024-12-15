const express = require("express");
const {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} = require("firebase/auth");
const {
  getAllDocumentsFromCollection,
  storeDataInDatabase,
  getDataFromDatabase,
  getFormattedDateTime,
  deleteDocFromDatabase,
} = require("../utils/helpers");
const { DB_COLLECTIONS } = require("../utils/constants");

const router = express.Router();

const auth = getAuth();

router.get("/inventory", async (req, res) => {
  try {
    const inventory = await getAllDocumentsFromCollection(
      DB_COLLECTIONS.inventory
    );
    res.status(200).json({ success: true, inventory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, inventory: [] });
  }
});

router.post("/add-item", async (req, res) => {
  try {
    const { itemData, update } = req.body;
    if (
      !itemData?.itemCode ||
      !itemData?.itemName ||
      !itemData?.category ||
      itemData?.price === null ||
      itemData?.availableStock === null ||
      itemData?.totalSold === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields. Please provide itemCode, itemName, category, price, availableStock, and totalSold.",
      });
    }

    if (!update) {
      const existingItem = await getDataFromDatabase(
        DB_COLLECTIONS.inventory,
        itemData?.itemCode
      );

      if (existingItem) {
        return res.status(400).json({
          success: false,
          message:
            "An item with this itemCode already exists in the inventory!",
        });
      }
    }

    const newItem = {
      itemCode: itemData?.itemCode,
      itemName: itemData?.itemName,
      category: itemData?.category,
      price: itemData?.price,
      availableStock: itemData?.availableStock,
      totalSold: itemData?.totalSold,
    };

    const status = await storeDataInDatabase(
      newItem,
      DB_COLLECTIONS.inventory,
      itemData?.itemCode
    );

    if (status) {
      return res.status(200).json({
        success: true,
        message: update
          ? "Item updated successfully!"
          : "Item added to inventory successfully!",
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong. Try again!",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Try again!",
    });
  }
});

router.post("/delete-item", async (req, res) => {
  try {
    const { itemCode } = req.body;
    success = await deleteDocFromDatabase(DB_COLLECTIONS.inventory, itemCode);
    res.status(200).json({
      success,
      message: success
        ? "Item deleted successfully!"
        : "Something went wrong. Try again!",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Try again!",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const userCredential = await signInWithEmailAndPassword(
      auth,
      username,
      password
    );
    const user = userCredential.user;

    res.status(200).json({
      success: true,
      message: "Login successful!",
      data: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error(error);

    let message = "Something went wrong. Try again!";
    if (error.code === "auth/user-not-found") {
      message = "User not found!";
    } else if (error.code === "auth/invalid-credential") {
      message = "Invalid credentials!";
    }

    res.status(500).json({
      success: false,
      message,
    });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, username, password } = req.body;
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      username,
      password
    );
    const user = userCredential.user;

    res.status(201).json({
      success: true,
      message: "Registration successful!",
      data: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error(error);

    let message = "Something went wrong. Try again!";
    if (error.code === "auth/email-already-in-use") {
      message = "Email is already in use!";
    } else if (error.code === "auth/weak-password") {
      message = "Password is too weak!";
    } else if (error.code === "auth/invalid-email") {
      message = "Invalid email address!";
    }

    res.status(500).json({
      success: false,
      message,
    });
  }
});

router.post("/process-order", async (req, res) => {
  try {
    const { orderData } = req.body;

    // Validate required fields
    if (
      !orderData?.orderId ||
      !orderData?.orderName ||
      !orderData?.itemCode ||
      !orderData?.quantity ||
      !orderData?.date ||
      !orderData?.time ||
      !orderData?.address ||
      orderData?.totalAmount === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields. Please provide orderId, orderName, itemCode, quantity, date, time, address, and totalAmount.",
      });
    }

    // Prepare new order object
    const newOrder = {
      orderId: orderData.orderId,
      orderName: orderData.orderName,
      itemCode: orderData.itemCode,
      quantity: orderData.quantity,
      date: orderData.date,
      time: orderData.time,
      address: orderData.address,
      totalAmount: orderData.totalAmount,
    };

    // Store in COLLECTIONS.orders
    const status = await storeDataInDatabase(
      newOrder,
      DB_COLLECTIONS.orders,
      orderData.orderId
    );

    if (status) {
      return res.status(200).json({
        success: true,
        message: "Order added successfully!",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to add the order. Please try again.",
    });
  } catch (error) {
    console.error("Error in /process-order:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Try again!",
    });
  }
});

router.get("/orders", async (req, res) => {
  try {
    const orders = await getAllDocumentsFromCollection(DB_COLLECTIONS.orders);
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, orders: [] });
  }
});

module.exports = router;
