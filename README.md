# 🚀 Zkracle Contract (ZK-ORACLE)

The Zkracle Contract is an innovative smart contract that leverages zk proofs to compute the median, standard deviations, and z-scores of API call results. This approach flags any API that returns a result exceeding three standard deviations of tolerance, ensuring data integrity.
This contract addresses the need for a robust oracle structure that doesn't rely on another network for data replication. Our goal is to enhance data handling in blockchain, contributing to more secure and trustworthy decentralized applications.


## 📋 Workflow

1. 📡 Four different API endpoints send responses along with a signature of the data using the oracle's private key.
2. 🧮 The ZkZscores program sanitizes the API call results. It calculates the average, median, and z-scores of the API call results in the baseCase method. It asserts that the z-scores are within the range of -2 to 2.
3. ✔️ The ZkZscores program verifies the earlier proof and asserts the balances in the step method.
4. 📜 The ZkZscores program generates a proof that can be verified on-chain.
5. 🔐 Zkracle Contract is initialized with a trusted oracle public key and a round ID of 0.
6. 📊 The contract has a state that includes the oracle public key, time lock merkle map root, balance merkle map root, round ID, latest price, and pair.
7. 💱 The contract has a method to initialize the pair with a given currency.
8. ✅ The contract has a method to verify the signature of the oracle. It checks if the signature is valid for the provided data. If the signature is valid, it emits a 'verified' event with the round ID.
9. 📬 The contract has a method to post a proof. It verifies the signature and the proof, emits a 'proofVerified' event, increments the round ID, and updates the latest price with the median of the API call results.

<p align="center">
  <img src="https://i.postimg.cc/T2cv9bTN/Minhack.png" alt="Diagram">
</p>


## 🛠️ Installation

Deploying the contract to the mainnet is a breeze! Just follow the example provided in the `.test` file which uses a `localMinaChain`. If you have any questions, feel free to raise an issue.

## 🎮 Usage

To get started, you'll need to create an API endpoint that's connected to a Mina account (your trusted Oracle account). Once you've done that, you're all set to interact with our Zk Circuit. This will generate the proof you need to post on-chain and retrieve the latest price of your pair. It's as simple as that! If you need any help along the way, don't hesitate to reach out.


## 📄 License

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.


