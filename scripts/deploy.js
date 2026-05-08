const hre = require("hardhat");

async function main() {
  const Contract = await hre.ethers.getContractFactory("ShareGate");
  const contract = await Contract.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("Deployed to:", address);
}

main();
