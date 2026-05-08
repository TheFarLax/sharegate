import db from "./db.js";
import express from "express";
import cors from "cors";
import { ethers } from "ethers";

const app = express();

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

      // hash share id
      const shareIdHash =
        ethers.id(
          shareId
        );

      // blockchain access
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

      // success
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
