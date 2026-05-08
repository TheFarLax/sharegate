import express from "express";
import cors from "cors";
import multer from "multer";
import { ethers } from "ethers";

import db from "./db.js";
import { uploadToIPFS } from "./ipfs.js";

const app = express();

const upload = multer();

app.use(cors());

app.use(
  express.json({
    limit: "50mb",
  })
);

// -----------------------------------
// TEMP KEY STORAGE
// -----------------------------------
const keys = {};

// -----------------------------------
// BASE RPC
// -----------------------------------
const provider =
  new ethers.JsonRpcProvider(
    "https://sepolia.base.org"
  );

// -----------------------------------
// CONTRACT
// -----------------------------------
const CONTRACT_ADDRESS =
  "0x5659b4Abe2422fe4370E0f4a56A319465B6d139f";

const ABI = [
  "function canAccess(bytes32 shareId, address user) view returns (bool)"
];

const contract =
  new ethers.Contract(
    CONTRACT_ADDRESS,
    ABI,
    provider
  );

// -----------------------------------
// HEALTH
// -----------------------------------
app.get("/", (req, res) => {

  res.send(
    "ShareGate backend running"
  );
});

// -----------------------------------
// UPLOAD TO IPFS
// -----------------------------------
app.post(
  "/upload",
  upload.single("file"),

  async (req, res) => {

    try {

      if (!req.file) {

        return res
          .status(400)
          .json({
            success: false,
            error:
              "No file uploaded",
          });
      }

      const cid =
        await uploadToIPFS(
          req.file.buffer
        );

      res.json({
        success: true,
        cid,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        error:
          "Upload failed",
      });
    }
  }
);

// -----------------------------------
// STORE KEY
// -----------------------------------
app.post(
  "/store-key",
  (req, res) => {

    try {

      const {
        shareId,
        key,
        iv,
        fileName,
        fileType,
      } = req.body;

      keys[shareId] = {
        key,
        iv,
        fileName,
        fileType,
      };

      res.json({
        success: true,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        error:
          "Store key failed",
      });
    }
  }
);

// -----------------------------------
// SAVE FILE METADATA
// -----------------------------------
app.post(
  "/save-file",
  (req, res) => {

    try {

      const {
        shareId,
        cid,
        ownerWallet,
        recipientWallet,
        fileName,
        fileType,
        expiry,
      } = req.body;

      db.run(
        `
        INSERT INTO files (
          shareId,
          cid,
          ownerWallet,
          recipientWallet,
          fileName,
          fileType,
          expiry
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          shareId,
          cid,
          ownerWallet,
          recipientWallet,
          fileName,
          fileType,
          expiry,
        ]
      );

      res.json({
        success: true,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
      });
    }
  }
);

// -----------------------------------
// REVOKE FILE
// -----------------------------------
app.post(
  "/revoke-file",
  (req, res) => {

    try {

      const {
        shareId
      } = req.body;

      db.run(
        `
        UPDATE files
        SET revoked = 1
        WHERE shareId = ?
        `,
        [shareId]
      );

      res.json({
        success: true,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
      });
    }
  }
);

// -----------------------------------
// GET FILES
// -----------------------------------
app.get(
  "/files/:wallet",
  (req, res) => {

    const wallet =
      req.params.wallet;

    db.all(
      `
      SELECT * FROM files
      WHERE ownerWallet = ?
      ORDER BY id DESC
      `,
      [wallet],

      (err, rows) => {

        if (err) {

          return res
            .status(500)
            .json({
              success: false,
            });
        }

        res.json({
          success: true,
          files: rows,
        });
      }
    );
  }
);

// -----------------------------------
// GET KEY
// -----------------------------------
app.post(
  "/get-key",
  async (req, res) => {

    try {

      const {
        shareId,
        wallet,
      } = req.body;

      const stored =
        keys[shareId];

      if (!stored) {

        return res
          .status(404)
          .json({
            success: false,
            error:
              "Key not found",
          });
      }

      const shareIdHash =
        ethers.id(
          shareId
        );

      const allowed =
        await contract.canAccess(
          shareIdHash,
          wallet
        );

      if (!allowed) {

        return res
          .status(403)
          .json({
            success: false,
            error:
              "No access",
          });
      }

      res.json({
        success: true,

        key:
          stored.key,

        iv:
          stored.iv,

        fileName:
          stored.fileName,

        fileType:
          stored.fileType,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        error:
          "Server error",
      });
    }
  }
);

// -----------------------------------
// START SERVER
// -----------------------------------
app.listen(3000, () => {

  console.log(
    "Server running on http://localhost:3000"
  );
});
