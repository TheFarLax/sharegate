const connectBtn =
  document.getElementById("connectBtn");

const downloadBtn =
  document.getElementById("downloadBtn");

const statusDiv =
  document.getElementById("status");

let walletAddress;

// -----------------------------------
// BASE64 → ARRAY BUFFER
// -----------------------------------
function base64ToArrayBuffer(
  base64
) {

  const binary =
    atob(base64);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {

    bytes[i] =
      binary.charCodeAt(i);
  }

  return bytes.buffer;
}

// -----------------------------------
// AES DECRYPT
// -----------------------------------
async function decryptFile(
  encryptedBuffer,
  keyBase64,
  ivBase64
) {

  // restore key
  const keyBuffer =
    base64ToArrayBuffer(
      keyBase64
    );

  // restore iv
  const iv =
    new Uint8Array(
      base64ToArrayBuffer(
        ivBase64
      )
    );

  // import AES key
  const cryptoKey =
    await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      {
        name: "AES-GCM",
      },
      false,
      ["decrypt"]
    );

  // decrypt
  const decrypted =
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      cryptoKey,
      encryptedBuffer
    );

  return decrypted;
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

      const signer =
        provider.getSigner();

      walletAddress =
        await signer.getAddress();

      connectBtn.innerText =
        walletAddress.slice(0, 6) +
        "..." +
        walletAddress.slice(-4);

      statusDiv.innerText =
        "Wallet connected";

    } catch (err) {

      console.error(err);

      statusDiv.innerText =
        "Wallet connection failed";
    }
  };

// -----------------------------------
// DOWNLOAD FLOW
// -----------------------------------
downloadBtn.onclick =
  async () => {

    try {

      if (!walletAddress) {

        alert(
          "Connect wallet first"
        );

        return;
      }

      // -----------------------------------
      // URL PARAMS
      // -----------------------------------
      const params =
        new URLSearchParams(
          window.location.search
        );

      const shareId =
        params.get("shareId");

      const cid =
        params.get("cid");

      if (!shareId || !cid) {

        throw new Error(
          "Invalid link"
        );
      }

      // -----------------------------------
      // GET KEY + IV
      // -----------------------------------
      statusDiv.innerText =
        "Checking access...";

      const keyRes =
        await fetch(
          "http://localhost:3000/get-key",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              shareId,
              wallet:
                walletAddress,
            }),
          }
        );

      const keyData =
        await keyRes.json();

      console.log(
        "KEY DATA:",
        keyData
      );

      if (!keyData.success) {

        throw new Error(
          keyData.error
        );
      }

      // -----------------------------------
      // DOWNLOAD ENCRYPTED FILE
      // -----------------------------------
      statusDiv.innerText =
        "Downloading encrypted file...";

      const fileRes =
        await fetch(
          `https://gateway.pinata.cloud/ipfs/${cid}`
        );

      const encryptedBuffer =
        await fileRes.arrayBuffer();

      // -----------------------------------
      // DECRYPT FILE
      // -----------------------------------
      statusDiv.innerText =
        "Decrypting file...";

      const decrypted =
        await decryptFile(
          encryptedBuffer,
          keyData.key,
          keyData.iv
        );

      // -----------------------------------
      // DOWNLOAD ORIGINAL FILE
      // -----------------------------------
      statusDiv.innerText =
        "Preparing download...";

      const blob =
        new Blob(
          [decrypted],
          {
            type:
              keyData.fileType,
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const a =
        document.createElement("a");

      a.href = url;

      a.download =
        keyData.fileName;

      document.body.appendChild(a);

      a.click();

      a.remove();

      statusDiv.innerText =
        "✅ File decrypted successfully";

    } catch (err) {

      console.error(err);

      statusDiv.innerText =
        "Download failed: " +
        err.message;
    }
  };
