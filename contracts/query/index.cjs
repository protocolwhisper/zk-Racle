const Koa = require("koa");
const Router = require("@koa/router");
const { isReady, PrivateKey, Field, Signature } = require("snarkyjs");
const { JSONPath } = require("jsonpath-plus");

const PORT = process.env.PORT || 3000;

const key = require('../scripts/key.json');

const app = new Koa();
const router = new Router();

// This helper function generates a random value within 5% of the original value
function generateNearbyValue(originalValue) {
  const tolerance = 0.05; // 5%
  const randomPercentage = (Math.random() - 0.5) * 2 * tolerance; // Random percentage between -tolerance and +tolerance
  return originalValue * (1 + randomPercentage);
}

export async function getSignedPriceInUSD(symbol, roundId) {
  // We need to wait for SnarkyJS to finish loading before we can do anything
  await isReady;

  // Request API from cryptocompare for ${symbol} price.
  const priceUrl =
  `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbol}&tsyms=USD`;
  const pricePath = `RAW.${symbol}.USD.PRICE`;

  const response = await fetch(priceUrl);
  const data = await response.json();
  const result = JSONPath({ path: pricePath, json: data });

  // The private key of our account. When running locally the hardcoded key will
  // be used. In production the key will be loaded from a Vercel environment
  // variable.

   const privateKey = PrivateKey.fromBase58(
        process.env.PRIVATE_KEY ?? key.privateKey
    );

  // We get the ${symbol} price.
  const knownPriceInUSD = result[0];
  const knownPriceInUSDx100 = Math.floor((knownPriceInUSD * 100));
  // NOTE: x100 store float on-chain (Field).

  // We compute the public key associated with our private key
  const publicKey = privateKey.toPublicKey();

  // Define a Field with the value of the users id
  const roundIdField = Field(roundId);

  // Define a Field with the ETH price
  const priceField = Field(knownPriceInUSDx100);

  // Generate nearby values
  const nearbyValue1 = generateNearbyValue(knownPriceInUSD);
  const nearbyValue2 = generateNearbyValue(knownPriceInUSD);
  const nearbyValue3 = generateNearbyValue(knownPriceInUSD);

  // Convert these nearby values to Field as well
  // This are the ones that will be onchain
  const nearbyField1 = Field(Math.floor(nearbyValue1 * 100));
  const nearbyField2 = Field(Math.floor(nearbyValue2 * 100));
  const nearbyField3 = Field(Math.floor(nearbyValue3 * 100));

  // Use our private key to sign an array of Fields containing the round id and
  // price InUSD
  const signature = Signature.create(privateKey, [
    roundIdField, 
    priceField,
    nearbyField1,
    nearbyField2,
    nearbyField3,
  ]);

  return {
    data: { 
      roundId: roundId, 
      prices: [
        { offchain: knownPriceInUSD, onchain: knownPriceInUSDx100 },
        { offchain: nearbyValue1, onchain: Math.floor(nearbyValue1 * 100) },
        { offchain: nearbyValue2, onchain: Math.floor(nearbyValue2 * 100) },
        { offchain: nearbyValue3, onchain: Math.floor(nearbyValue3 * 100) },
      ]
    },
    signature: signature,
    publicKey: publicKey,
  };
}

router.get("/:symbol/:roundId", async (ctx) => {
  ctx.body = await getSignedPriceInUSD(ctx.params.symbol, ctx.params.roundId);
});

app.use(router.routes()).use(router.allowedMethods());

console.log(`offchain-price signer -- listen :${PORT}`);
app.listen(PORT);
