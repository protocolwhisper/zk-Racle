import { circuitArray } from 'snarkyjs/dist/node/lib/circuit_value';
import { zkracle , ZkZscores , RecursiveProof, DataRecursiveInput  } from './raclecircuit';
import {
  isReady,
  shutdown,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  UInt64,
  Signature,
  Field,
  Poseidon,
  MerkleMap,
  CircuitString,
  UInt32,
  Circuit,
} from 'snarkyjs';

let proofsEnabled = false;

describe('ZkOracle', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    zkOracleAddress: PublicKey,
    zkOraclePrivateKey: PrivateKey,
    zkOracle: zkracle,
    proof: Field;

  beforeAll(async () => {
    await isReady;
    if (proofsEnabled) zkracle.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    zkOraclePrivateKey = PrivateKey.random();
    zkOracleAddress = zkOraclePrivateKey.toPublicKey();
    zkOracle = new zkracle(zkOracleAddress);
    proof = Field.random(); // What's with this proof 

  });

  afterAll(() => {
    setTimeout(shutdown, 0);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkOracle.init(deployerKey)
      zkOracle.initPair(CircuitString.fromString('ETH'))
      zkOracle.deploy();
    });
    await txn.prove();
    await txn.sign([deployerKey]).send();
    return true
  }

  it('Init contract state', async () => {
    let deploy = await localDeploy();
    expect(deploy).toBeTruthy();
  });

  it('Generate zkzscores-circuit proofs', async () => {
    await localDeploy();
    // Pull from the API'S in the next version
    let mock_api_results = Circuit.array(UInt32,5)
    // ETH Prices
    let results = new Field(185252)
    let resultsone = new Field(187501)
    let resultstwo = new Field(181632)
    let resuktsthree = new Field(186444)
    mock_api_results.fromFields([results , resultsone , resultstwo , resuktsthree])
    let mock2 = Signature.create(deployerKey , [results , resultsone , resultstwo , resuktsthree])
    const DataRecursiveInput = {oracle_public_key: deployerAccount,
      signed_call_results: mock2,
      api_result_onchain: mock_api_results, 
      
    }
    let proof = await ZkZscores.baseCase(DataRecursiveInput)
    let pricebefore = await zkOracle.latestPrice.get()
    const postDataTxn = await Mina.transaction(deployerAccount, () => {
      zkOracle.postProof(proof);
    });
    await postDataTxn.prove();
    await postDataTxn.sign([deployerKey]).send();
    expect(zkOracle.latestPrice.get()).not.toBe(pricebefore)
  });
});
