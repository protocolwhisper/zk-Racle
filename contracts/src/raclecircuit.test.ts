import { DataRecursiveInput, raclecircuit , RecursiveProgram} from './raclecircuit';
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
} from 'snarkyjs';

import axios from 'axios';

describe('raclecircuit.js', () => {
  beforeAll(async () => {
    await isReady;
    if (proofsEnabled) Lightning.compile();
    amount100 = UInt64.from(100);

    //

    const key = require('../scripts/key.json');
    const privateKey = PrivateKey.fromBase58(
      process.env.PRIVATE_KEY ?? key.privateKey);

    


  });

  beforeEach(async () => {
    interface ApiResponse {
      data: {
        roundId: string;
        prices: {
          offchain: number;
          onchain: number;
        }[];
      };
      signature: {
        r: string;
        s: string;
      };
      publicKey: string;
    }    


    let eth_response : ApiResponse = await axios.get(`http://localhost:3000/ETH/1`);
    let btc_response : ApiResponse = await axios.get(`http://localhost:3000/BTC/2`);
    
    const eth_prices1 = eth_response.data.prices[0].onchain;
    const eth_prices2 = eth_response.data.prices[1].onchain;
    const eth_prices3 = eth_response.data.prices[2].onchain;
    const eth_prices4 = eth_response.data.prices[3].onchain;
    
    // can i do round id {eth1 , eth 2 , 3th , eth 4 }
    // Btc prices 

    const btc_prices1 = btc_response.data.prices[0].onchain;
    const btc_prices2 = btc_response.data.prices[1].onchain;
    const btc_prices3 = btc_response.data.prices[2].onchain;
    const btc_prices4 = btc_response.data.prices[3].onchain;
    
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Lightning(zkAppAddress);
    timeLockMerkleMap = new MerkleMap();
    balanceMerkeleMap = new MerkleMap();

    // init token contract
    tokenPrivateKey = PrivateKey.random();
    tokenAddress = tokenPrivateKey.toPublicKey();
    tokenApp = new ExampleToken(tokenAddress);
  });

  afterAll(() => {
    // `shutdown()` internally calls `process.exit()` which will exit the running Jest process early.
    // Specifying a timeout of 0 is a workaround to defer `shutdown()` until Jest is done running all tests.
    // This should be fixed with https://github.com/MinaProtocol/mina/issues/10943
    setTimeout(shutdown, 0);
  });


  describe('Validating Inputs', async () => {
    interface ApiResponse {
      data: {
        roundId: string;
        prices: {
          offchain: number;
          onchain: number;
        }[];
      };
      signature: {
        r: string;
        s: string;
      };
      publicKey: string;
    }    

    let eth_response : ApiResponse = await axios.get(`http://localhost:3000/ETH/1`);
    
    const DataRecursiveInput = {
      oracle_public_key: Field,
      oracle_signature: Signature,
      call_results: Signature,
      api_result_offchain: Field,
      api_result_onchain: Field,
    }
    let oracle_key = Field
    DataRecursiveInput.oracle_public_key = new Field(eth_response.publicKey)
    it.todo('should be correct');
  });

  describe('raclecircuit()', () => {
    let price_witness = new MerkleMap();
    let initWitness = price_witness.getRoot()
    
    it.todo('should be correct');
  });

  describe('raclecircuit()', () => {
    it.todo('should be correct');
  });
});
