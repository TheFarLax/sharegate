import dns from "dns";
import dotenv from "dotenv";

dns.setDefaultResultOrder("ipv4first");

dotenv.config();

export async function uploadToIPFS(buffer) {
  try {
    const formData = new FormData();

    const blob = new Blob([buffer]);

    formData.append(
      "file",
      blob,
      "file.txt"
    );

    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${process.env.PINATA_JWT}`,
        },
        body: formData,
      }
    );

    const data = await response.json();

    console.log(data);

    if (!response.ok) {
      throw new Error(
        JSON.stringify(data)
      );
    }

    return data.IpfsHash;

  } catch (err) {
    console.error(
      "PINATA FETCH ERROR:",
      err
    );

    throw err;
  }
}
