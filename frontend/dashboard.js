const connectBtn =
  document.getElementById(
    "connectBtn"
  );

const filesGrid =
  document.getElementById(
    "filesGrid"
  );

let wallet;

// -----------------------------------
// CONTRACT
// -----------------------------------
const CONTRACT_ADDRESS =
  "0x5659b4Abe2422fe4370E0f4a56A319465B6d139f";

const ABI = [
  "function revokeAccess(bytes32 shareId, address user) external"
];

// -----------------------------------
// TOAST
// -----------------------------------
function showToast(
  message
) {

  const toast =
    document.createElement(
      "div"
    );

  toast.className =
    "toast";

  toast.innerText =
    message;

  document.body.appendChild(
    toast
  );

  setTimeout(() => {

    toast.remove();

  }, 3000);
}

// -----------------------------------
// LOAD FILES
// -----------------------------------
async function loadFiles() {

  const res =
    await fetch(
      `https://sharegate-backend.onrender.com/files/${wallet}`
    );

  const data =
    await res.json();

  console.log(data);

  if (!data.success) {

    showToast(
      "Failed to load files"
    );

    return;
  }

  filesGrid.innerHTML = "";

  for (
    const file of data.files
  ) {

    const shareLink =
      `https://YOUR-VERCEL-URL.vercel.app/download.html?shareId=${file.shareId}&cid=${file.cid}`;

    // -----------------------------------
    // STATUS
    // -----------------------------------
    let status =
      "Permanent";

    if (file.revoked === 1) {

      status =
        "Revoked";

    } else if (
      file.expiry &&
      file.expiry !== 0
    ) {

      const now =
        Math.floor(
          Date.now() / 1000
        );

      status =
        now > file.expiry
          ? "Expired"
          : "Active";
    }

    // -----------------------------------
    // CARD
    // -----------------------------------
    const div =
      document.createElement(
        "div"
      );

    div.className =
      "fileCard";

    div.innerHTML = `
      <div class="fileName">
        ${file.fileName}
      </div>

      <div class="meta">
        Recipient:
        ${file.recipientWallet}
      </div>

      <div class="meta">
        CID:
        ${file.cid}
      </div>

      <div class="
        badge
        ${status.toLowerCase()}
      ">
        ${status}
      </div>

      <div class="meta">
        ${file.createdAt}
      </div>

      <div class="actions">

        <a
          href="${shareLink}"
          target="_blank"
          class="linkBtn"
        >
          Open
        </a>

        <button
          onclick="copyLink(
            '${shareLink}'
          )"
        >
          Copy Link
        </button>

        ${
          file.revoked === 1
            ? ""
            : `
              <button
                onclick="revokeAccess(
                  '${file.shareId}',
                  '${file.recipientWallet}'
                )"
              >
                Revoke
              </button>
            `
        }

      </div>
    `;

    filesGrid.appendChild(
      div
    );
  }
}

// -----------------------------------
// CONNECT WALLET
// -----------------------------------
connectBtn.onclick =
  async () => {

    try {

      if (!window.ethereum) {

        showToast(
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

      wallet =
        await signer.getAddress();

      connectBtn.innerText =
        wallet.slice(0, 6) +
        "..." +
        wallet.slice(-4);

      showToast(
        "Wallet connected"
      );

      await loadFiles();

    } catch (err) {

      console.error(err);

      showToast(
        "Wallet connection failed"
      );
    }
  };

// -----------------------------------
// COPY LINK
// -----------------------------------
async function copyLink(
  link
) {

  try {

    await navigator.clipboard.writeText(
      link
    );

    showToast(
      "Share link copied"
    );

  } catch (err) {

    console.error(err);

    showToast(
      "Copy failed"
    );
  }
}

// -----------------------------------
// REVOKE ACCESS
// -----------------------------------
async function revokeAccess(
  shareId,
  recipient
) {

  try {

    const provider =
      new ethers.providers.Web3Provider(
        window.ethereum
      );

    const signer =
      provider.getSigner();

    const contract =
      new ethers.Contract(
        CONTRACT_ADDRESS,
        ABI,
        signer
      );

    // revoke tx
    showToast(
      "Waiting for confirmation..."
    );

    const tx =
      await contract.revokeAccess(
        ethers.utils.id(
          shareId
        ),
        recipient
      );

    await tx.wait(1);

    // update DB
    await fetch(
      "https://sharegate-backend.onrender.com/revoke-file",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          shareId
        }),
      }
    );

    showToast(
      "Access revoked"
    );

    // reload dashboard
    await loadFiles();

  } catch (err) {

    console.error(err);

    showToast(
      "Revoke failed"
    );
  }
}
