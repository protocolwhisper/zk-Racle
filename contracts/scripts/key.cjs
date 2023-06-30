const { isReady, PrivateKey, shutdown } = require("snarkyjs");
const fs = require('fs');

async function generateKeypair() {
  await isReady;
  const privateKey = PrivateKey.random();
  const publicKey = privateKey.toPublicKey();
  const encodedPrivateKey = privateKey.toBase58();
  const encodedPublicKey = publicKey.toBase58();

  const keypair = { privateKey: encodedPrivateKey, publicKey: encodedPublicKey };

  console.log(keypair);

  fs.writeFile('key.json', JSON.stringify(keypair, null, 2), (err) => {
    if (err) throw err;
    console.log('Data written to file');
  });
}

generateKeypair().then(shutdown);
