const connectBtn =
  document.getElementById("connectBtn");

const uploadBtn =
  document.getElementById("uploadBtn");

const statusDiv =
  document.getElementById("status");
  const fileInput =
  document.getElementById(
    "fileInput"
  );

const dropTitle =
  document.getElementById(
    "dropTitle"
  );

const dropSubtitle =
  document.getElementById(
    "dropSubtitle"
  );

let signer;

// -----------------------------------
// FILE UI
// -----------------------------------
fileInput.addEventListener(
  "change",
  () => {

    const file =
      fileInput.files[0];

    if (!file) return;

    dropTitle.innerText =
      file.name;

    dropSubtitle.innerText =
      `${(
        file.size /
        1024 /
        1024
      ).toFixed(2)} MB selected`;
  }
);

// -----------------------------------
// BASE SEPOLIA
// -----------------------------------
const BASE_SEPOLIA_CHAIN_ID =
  84532;

// -----------------------------------
// CONTRACT
// -----------------------------------
const CONTRACT_ADDRESS =
  "0x5659b4Abe2422fe4370E0f4a56A319465B6d139f";

const ABI = [
  "function createShare(bytes32 shareId, uint256 expiry) external",
  "function grantAccess(bytes32 shareId, address user) external"
];

// -----------------------------------
// AES ENCRYPT
// -----------------------------------
async function encryptFile(
  arrayBuffer
) {

  const key =
    await crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );

  const iv =
    crypto.getRandomValues(
      new Uint8Array(12)
    );

  const encrypted =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      arrayBuffer
    );

  const exportedKey =
    await crypto.subtle.exportKey(
      "raw",
      key
    );

  const keyBase64 =
    btoa(
      String.fromCharCode(
        ...new Uint8Array(
          exportedKey
        )
      )
    );

  const ivBase64 =
    btoa(
      String.fromCharCode(
        ...iv
      )
    );

  return {
    encrypted,
    key: keyBase64,
    iv: ivBase64,
  };
}

// -----------------------------------
// SWITCH NETWORK
// -----------------------------------
async function switchToBaseSepolia() {

  const chainId =
    await window.ethereum.request({
      method: "eth_chainId",
    });

  if (
    parseInt(chainId, 16) ===
    BASE_SEPOLIA_CHAIN_ID
  ) {
    return;
  }

  try {

    await window.ethereum.request({
      method:
        "wallet_switchEthereumChain",

      params: [
        {
          chainId:
            "0x14A34",
        },
      ],
    });

  } catch (switchError) {

    if (
      switchError.code === 4902
    ) {

      await window.ethereum.request({
        method:
          "wallet_addEthereumChain",

        params: [
          {
            chainId:
              "0x14A34",

            chainName:
              "Base Sepolia",

            nativeCurrency: {
              name: "ETH",
              symbol: "ETH",
              decimals: 18,
            },

            rpcUrls: [
              "https://sepolia.base.org",
            ],

            blockExplorerUrls: [
              "https://sepolia.basescan.org",
            ],
          },
        ],
      });

    } else {

      throw switchError;
    }
  }
}

// -----------------------------------
// CONNECT WALLET
// -----------------------------------
connectBtn.onclick =
  async () => {

    try {

      if (!window.ethereum) {

        alert(
          "Install MetaMask"
        );

        return;
      }

      const provider =
        new ethers.providers.Web3Provider(
          window.ethereum
        );

      await provider.send(
        "eth_requestAccounts",
        []
      );

      await switchToBaseSepolia();

      signer =
        provider.getSigner();

      const address =
        await signer.getAddress();

      connectBtn.innerText =
        address.slice(0, 6) +
        "..." +
        address.slice(-4);

      statusDiv.innerText =
        "Wallet connected";

    } catch (err) {

      console.error(err);

      statusDiv.innerText =
        "Wallet connection failed";
    }
  };

// -----------------------------------
// UPLOAD FLOW
// -----------------------------------
uploadBtn.onclick =
  async () => {

    try {

      if (!signer) {

        alert(
          "Connect wallet first"
        );

        return;
      }

      // network check
      const currentChain =
        await window.ethereum.request({
          method: "eth_chainId",
        });

      const currentChainDecimal =
        parseInt(
          currentChain,
          16
        );

      if (
        currentChainDecimal !==
        BASE_SEPOLIA_CHAIN_ID
      ) {

        await switchToBaseSepolia();

        throw new Error(
          "Switched network. Please upload again."
        );
      }

      // -----------------------------------
      // INPUTS
      // -----------------------------------
      const fileInput =
        document.getElementById(
          "fileInput"
        );

      // FIXED RECIPIENT
      const recipientInput =
        document.getElementById(
          "recipient"
        );

      const recipient =
        recipientInput.value.trim();

      console.log(
        "RECIPIENT:",
        recipient
      );

      // VALIDATION
      if (
        !ethers.utils.isAddress(
          recipient
        )
      ) {

        throw new Error(
          "Invalid recipient wallet"
        );
      }

      const expirySeconds =
        parseInt(
          document.getElementById(
            "expirySelect"
          ).value
        );

      const file =
        fileInput.files[0];

      if (!file) {

        alert(
          "Select file"
        );

        return;
      }

      // -----------------------------------
      // READ FILE
      // -----------------------------------
      statusDiv.innerText =
        "Reading file...";

      const arrayBuffer =
        await file.arrayBuffer();

      // -----------------------------------
      // ENCRYPT
      // -----------------------------------
      statusDiv.innerText =
        "Encrypting file...";

      const encryptedData =
        await encryptFile(
          arrayBuffer
        );

      // -----------------------------------
      // SHARE ID
      // -----------------------------------
      const shareId =
        Date.now().toString();

      let expiryTimestamp = 0;

      if (expirySeconds > 0) {

        expiryTimestamp =
          Math.floor(
            Date.now() / 1000
          ) + expirySeconds;
      }

      // -----------------------------------
      // PINATA UPLOAD
      // -----------------------------------
      statusDiv.innerText =
        "Uploading encrypted file...";

      const formData =
        new FormData();

      const blob =
        new Blob(
          [
            encryptedData.encrypted
          ],
          {
            type:
              "application/octet-stream",
          }
        );

      formData.append(
        "file",
        blob,
        file.name + ".encrypted"
      );

      const uploadRes =
        await fetch(
          "http://localhost:3000/upload",
          {
            method: "POST",

            body: formData,
          }
        );

      const uploadData =
        await uploadRes.json();

      if (!uploadData.success) {

        throw new Error(
          uploadData.error ||
          "Upload failed"
        );
      }

      const cid =
        uploadData.cid;

      // -----------------------------------
      // STORE KEY
      // -----------------------------------
      statusDiv.innerText =
        "Saving encryption key...";

      await fetch(
        "http://localhost:3000/store-key",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            shareId,

            key:
              encryptedData.key,

            iv:
              encryptedData.iv,

            fileName:
              file.name,

            fileType:
              file.type,
          }),
        }
      );

      // -----------------------------------
      // CONTRACT
      // -----------------------------------
      statusDiv.innerText =
        "Creating blockchain share...";

      const contract =
        new ethers.Contract(
          CONTRACT_ADDRESS,
          ABI,
          signer
        );

      const shareIdHash =
        ethers.utils.id(
          shareId
        );

      // CREATE SHARE
      const tx1 =
        await contract.createShare(
          shareIdHash,
          expiryTimestamp
        );

      await tx1.wait(2);

      // small delay
      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            3000
          )
      );

      // GRANT ACCESS
      statusDiv.innerText =
        "Granting access...";

      const tx2 =
        await contract.grantAccess(
          shareIdHash,
          recipient
        );

      await tx2.wait(1);

      // -----------------------------------
      // SAVE DB
      // -----------------------------------
      await fetch(
        "http://localhost:3000/save-file",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            shareId,
            cid,

            ownerWallet:
              await signer.getAddress(),

            recipientWallet:
              recipient,

            fileName:
              file.name,

            fileType:
              file.type,

            expiry:
              expiryTimestamp,
          }),
        }
      );

      // -----------------------------------
      // SHARE LINK
      // -----------------------------------
      const shareLink =
        `http://localhost:8080/download.html?shareId=${shareId}&cid=${cid}`;

      statusDiv.innerHTML = `
        <p>
          ✅ Encrypted upload successful
        </p>

        <p>
          CID:
          ${cid}
        </p>

        <a
          href="${shareLink}"
          target="_blank"
          style="color:#4da3ff;"
        >
          Open Share Link
        </a>
      `;

    } catch (err) {

      console.error(err);

      statusDiv.innerText =
        "Upload failed: " +
        err.message;
    }
  };
